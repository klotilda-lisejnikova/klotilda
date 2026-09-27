import { createRateLimiter, generateId, HttpError } from '@eleansphere/be-core';
import type { EmailService, ProjectPlugin, RateLimitConfig, Sequelize } from '@eleansphere/be-core';
import {
  CHECKOUT_PATH,
  DEFAULT_ORDER_STATUS,
  DEFAULT_PAYMENT_STATUS,
  orderEntity,
  productEntity,
  SHIPPING_PRICES,
} from '@klotilda/domain';
import type { CheckoutItem, CheckoutResponse, OrderItem } from '@klotilda/domain';
import { newOrderEmail, orderReceivedEmail } from '../emails/order-emails';
import type { PlacedOrder } from '../emails/order-emails';
import type { BankAccount } from '../env';
import { asyncHandler } from '../http/async-handler';
import type { ModelRegistry } from '../models-registry';
import { createQrPaymentDataUrl, createVariableSymbol } from './qr-payment';
import { readCheckoutRequest } from './read-checkout-request';

const CREATED = 201;
const BAD_REQUEST = 400;
const CONFLICT = 409;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
/** Plenty for a customer retrying a form; a script placing orders to hold the stock hits it. */
export const CHECKOUT_RATE_LIMIT: RateLimitConfig = { windowMs: RATE_LIMIT_WINDOW_MS, max: 10 };

export interface CheckoutPluginOptions {
  registry: ModelRegistry;
  bankAccount: BankAccount;
  /** Where new orders are announced; unset, only the customer is e-mailed. */
  adminEmail: string | undefined;
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

function sendQuietly(
  emailService: EmailService,
  to: string,
  message: { subject: string; html: string }
) {
  emailService
    .send({ to, ...message })
    .catch((err: unknown) => console.error(`Order e-mail to ${to} failed:`, err));
}

/**
 * `POST /api/checkout` — public. Places an order from the cart: prices come from the products,
 * never from the client; the stock is taken down at once (payment is a bank transfer the admin
 * confirms later, matched by the variable symbol). Answers how to pay, QR code included, and
 * e-mails the customer and the artist; a failed e-mail is only logged.
 */
export function createCheckoutPlugin({
  registry,
  bankAccount,
  adminEmail,
  rateLimit,
}: CheckoutPluginOptions): ProjectPlugin {
  return {
    registerRoutes(app, sequelize, _models, emailService) {
      const limits = rateLimit === 'off' ? [] : [createRateLimiter(rateLimit)];
      app.post(
        CHECKOUT_PATH,
        ...limits,
        asyncHandler(async (req, res) => {
          const { items, ...customer } = readCheckoutRequest(req.body);
          const shippingPrice = SHIPPING_PRICES[customer.shippingMethod];

          const order: PlacedOrder = await sequelize.transaction(async (transaction) => {
            const orderItems = await reserveStock(registry, items, transaction);
            const itemsTotal = orderItems.reduce(
              (sum, item) => sum + item.price * item.quantity,
              0
            );
            const placed = {
              id: generateId(orderEntity.config.prefix),
              ...customer,
              shippingPrice,
              totalAmount: itemsTotal + shippingPrice,
              variableSymbol: createVariableSymbol(),
              paymentStatus: DEFAULT_PAYMENT_STATUS,
              orderStatus: DEFAULT_ORDER_STATUS,
            };
            await registry
              .get(orderEntity.config.name)
              .create({ ...placed, items: JSON.stringify(orderItems) }, { transaction });
            return { ...placed, items: orderItems };
          });

          const answer: CheckoutResponse = {
            orderId: order.id,
            variableSymbol: order.variableSymbol,
            amount: order.totalAmount,
            bankAccount: bankAccount.display,
            qrCodeDataUrl: await createQrPaymentDataUrl(bankAccount, {
              amount: order.totalAmount,
              variableSymbol: order.variableSymbol,
              message: `Objednavka ${order.id}`,
            }),
          };

          if (emailService) {
            sendQuietly(
              emailService,
              order.customerEmail,
              orderReceivedEmail(order, bankAccount.display)
            );
            if (adminEmail) sendQuietly(emailService, adminEmail, newOrderEmail(order));
          }
          res.status(CREATED).json(answer);
        })
      );
    },
  };
}
