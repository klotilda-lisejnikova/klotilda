import { createRateLimiter, generateId, HttpError } from '@eleansphere/be-core';
import type { EmailService, ProjectPlugin, RateLimitConfig, Sequelize } from '@eleansphere/be-core';
import {
  CHECKOUT_PATH,
  DEFAULT_ORDER_STATUS,
  DEFAULT_PAYMENT_STATUS,
  orderEntity,
  productEntity,
  TERMS_CHANGED,
} from '@klotilda/domain';
import type {
  CheckoutItem,
  CheckoutResponse,
  OrderEvent,
  OrderItem,
  PaymentStatus,
} from '@klotilda/domain';
import { resolveEmailText } from '../emails/email-templates';
import { resolveSellerLine } from '../seller/seller';
import { newOrderEmail, orderReceivedEmail } from '../emails/order-emails';
import type { PlacedOrder } from '../emails/order-emails';
import { sendEmail } from '../emails/send-email';
import type { BankAccount } from '../env';
import { asyncHandler } from '../http/async-handler';
import { findCurrentVersion } from '../legal/legal-documents';
import type { ModelRegistry } from '../models-registry';
import { createQrPaymentDataUrl, createVariableSymbol } from './qr-payment';
import { resolveOfferedPayment } from '../payments/payment-methods';
import { resolveOfferedShipping } from '../shipping/shipping-methods';
import { readCheckoutRequest } from './read-checkout-request';

const CREATED = 201;
const BAD_REQUEST = 400;
const CONFLICT = 409;
const UNAVAILABLE = 503;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
/** Plenty for a customer retrying a form; a script placing orders to hold the stock hits it. */
export const CHECKOUT_RATE_LIMIT: RateLimitConfig = { windowMs: RATE_LIMIT_WINDOW_MS, max: 10 };

export interface CheckoutPluginOptions {
  registry: ModelRegistry;
  bankAccount: BankAccount;
  /** Where new orders are announced; unset, only the customer is e-mailed. */
  adminEmail: string | undefined;
  /** Linked from the e-mails. */
  siteUrl: string;
  rateLimit: RateLimitConfig | 'off';
}

type Transaction = Awaited<ReturnType<Sequelize['transaction']>>;

/**
 * The ordered lines at today's prices, with each product's stock taken down. Runs inside the
 * order's transaction with the product rows locked, so two customers can't both buy the last
 * piece: the second waits, then sees it gone.
 */
async function reserveStock(
  registry: ModelRegistry,
  items: CheckoutItem[],
  transaction: Transaction
): Promise<OrderItem[]> {
  const products = await registry.get(productEntity.config.name).findAll({
    where: { id: items.map((item) => item.productId), active: true },
    lock: transaction.LOCK.UPDATE,
    transaction,
  });
  const byId = new Map(products.map((product) => [String(product.get('id')), product]));

  return Promise.all(
    items.map(async ({ productId, quantity }) => {
      const product = byId.get(productId);
      if (!product) throw new HttpError(BAD_REQUEST, `Produkt ${productId} není v nabídce`);
      const name = String(product.get('name_cs'));
      const stock = Number(product.get('stockCount'));
      if (stock < quantity) throw new HttpError(CONFLICT, `Produkt "${name}" už není skladem`);
      await product.update({ stockCount: stock - quantity }, { transaction });
      return { productId, name, price: Number(product.get('price')), quantity };
    })
  );
}

/**
 * The terms version the order is placed under: the current one, which must be the one the shop
 * showed when it says which (412 otherwise, so the customer reads the new terms first).
 */
async function resolveAgreedTermsVersion(
  registry: ModelRegistry,
  shown: string | undefined,
  transaction: Transaction
): Promise<string> {
  const current = await findCurrentVersion(registry, 'terms', transaction);
  if (!current) throw new HttpError(UNAVAILABLE, 'Obchodní podmínky nejsou zveřejněné');
  const version = String(current.get('version'));
  if (shown !== undefined && shown !== version) {
    throw new HttpError(
      TERMS_CHANGED,
      'Obchodní podmínky se mezitím změnily. Přečtěte si prosím novou verzi.'
    );
  }
  return version;
}

/**
 * The confirmation to the customer and the announcement to the artist, after the answer is sent.
 * How the customer's went is written into the order's first history line.
 */
async function announceOrder(
  registry: ModelRegistry,
  emailService: EmailService | undefined,
  {
    order,
    placedEvent,
    bankAccount,
    adminEmail,
    siteUrl,
  }: {
    order: PlacedOrder;
    placedEvent: OrderEvent;
    bankAccount: BankAccount;
    adminEmail: string | undefined;
    siteUrl: string;
  }
): Promise<void> {
  const [received, announced, sellerLine] = await Promise.all([
    resolveEmailText(registry, 'order-received'),
    resolveEmailText(registry, 'new-order'),
    resolveSellerLine(registry),
  ]);
  const footer = { siteUrl, sellerLine };
  const [email] = await Promise.all([
    sendEmail(
      emailService,
      order.customerEmail,
      orderReceivedEmail(order, bankAccount.display, received.text),
      footer
    ),
    adminEmail &&
      announced.enabled &&
      sendEmail(emailService, adminEmail, newOrderEmail(order, announced.text), footer),
  ]);
  await registry
    .get(orderEntity.config.name)
    .update({ history: JSON.stringify([{ ...placedEvent, email }]) }, { where: { id: order.id } });
}

/** How the customer pays: the account and a QR code for a transfer, nothing more for cash. */
async function paymentAnswer(
  order: PlacedOrder,
  bankAccount: BankAccount
): Promise<CheckoutResponse> {
  const placed = {
    orderId: order.id,
    variableSymbol: order.variableSymbol,
    amount: order.totalAmount,
  };
  if (order.paymentKind === 'cash') return { ...placed, paymentKind: 'cash' };
  return {
    ...placed,
    paymentKind: 'bank_transfer',
    bankAccount: bankAccount.display,
    qrCodeDataUrl: await createQrPaymentDataUrl(bankAccount, {
      amount: order.totalAmount,
      variableSymbol: order.variableSymbol,
      message: `Objednavka ${order.id}`,
    }),
  };
}

/**
 * `POST /api/checkout` — public. Places an order from the cart: prices come from the products
 * and the chosen active shipping and payment methods, never from the client; the stock is taken
 * down at once (a bank transfer the admin confirms later, matched by the variable symbol, or cash
 * at pickup). Answers how to pay, then e-mails the customer and the artist; a failed e-mail is
 * logged and noted in the order's history.
 */
export function createCheckoutPlugin({
  registry,
  bankAccount,
  adminEmail,
  siteUrl,
  rateLimit,
}: CheckoutPluginOptions): ProjectPlugin {
  return {
    registerRoutes(app, sequelize, _models, emailService) {
      const limits = rateLimit === 'off' ? [] : [createRateLimiter(rateLimit)];
      app.post(
        CHECKOUT_PATH,
        ...limits,
        asyncHandler(async (req, res) => {
          const {
            items,
            termsAccepted: _accepted,
            termsVersion: shownTerms,
            ...customer
          } = readCheckoutRequest(req.body);

          const placedEvent: OrderEvent = { type: 'placed', at: new Date().toISOString() };
          const order: PlacedOrder = await sequelize.transaction(async (transaction) => {
            const termsVersion = await resolveAgreedTermsVersion(registry, shownTerms, transaction);
            const shipping = await resolveOfferedShipping(
              registry,
              customer.shippingMethod,
              transaction
            );
            const payment = await resolveOfferedPayment(
              registry,
              customer.paymentMethod,
              shipping.shippingKind,
              transaction
            );
            const orderItems = await reserveStock(registry, items, transaction);
            const itemsTotal = orderItems.reduce(
              (sum, item) => sum + item.price * item.quantity,
              0
            );
            const placed = {
              id: generateId(orderEntity.config.prefix),
              ...customer,
              ...shipping,
              ...payment,
              totalAmount: itemsTotal + shipping.shippingPrice + payment.paymentFee,
              variableSymbol: createVariableSymbol(),
              paymentStatus: DEFAULT_PAYMENT_STATUS as PaymentStatus,
              orderStatus: DEFAULT_ORDER_STATUS,
              termsVersion,
            };
            await registry.get(orderEntity.config.name).create(
              {
                ...placed,
                items: JSON.stringify(orderItems),
                history: JSON.stringify([placedEvent]),
                termsAcceptedAt: placedEvent.at,
              },
              { transaction }
            );
            return { ...placed, items: orderItems };
          });

          res.status(CREATED).json(await paymentAnswer(order, bankAccount));
          announceOrder(registry, emailService, {
            order,
            placedEvent,
            bankAccount,
            adminEmail,
            siteUrl,
          }).catch((err: unknown) => console.error(`Announcing order ${order.id} failed:`, err));
        })
      );
    },
  };
}
