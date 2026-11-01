import {
  createVerifyToken,
  HttpError,
  validateFields,
  ValidationError,
} from '@eleansphere/be-core';
import type { ProjectPlugin, Sequelize } from '@eleansphere/be-core';
import {
  applyAction,
  availableActions,
  isEmailTemplateKey,
  ORDER_ACTION_ROUTE,
  ORDER_ACTIONS,
  orderActionFields,
  orderEntity,
  parseOrderHistory,
  parseOrderItems,
  productEntity,
  shippingMethodEntity,
  trackingUrlFor,
} from '@klotilda/domain';
import type {
  Order,
  OrderAction,
  OrderActionRequest,
  OrderEvent,
  OrderItem,
  OrderState,
} from '@klotilda/domain';
import type { EmailContent } from '../emails/email-layout';
import { resolveEmailText } from '../emails/email-templates';
import { orderActionEmail } from '../emails/order-emails';
import type { ActionDetails, PlacedOrder } from '../emails/order-emails';
import { sendEmail } from '../emails/send-email';
import { resolveSellerLine } from '../seller/seller';
import { asyncHandler } from '../http/async-handler';
import type { ModelRegistry } from '../models-registry';
import { reviewInvitationDetails } from '../reviews/review-invitation';

const NOT_FOUND = 404;
const CONFLICT = 409;

export interface OrderActionsPluginOptions {
  registry: ModelRegistry;
  jwtSecret: string;
  siteUrl: string;
}

type Transaction = Awaited<ReturnType<Sequelize['transaction']>>;

function readActionRequest(body: unknown): OrderActionRequest {
  const request = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const issues = validateFields(orderActionFields, request, { mode: 'patch' });
  if (issues.length > 0) throw new ValidationError(issues);
  return request as OrderActionRequest;
}

/** A cancelled order's pieces go back on sale; products deleted since are skipped. */
async function restock(registry: ModelRegistry, items: OrderItem[], transaction: Transaction) {
  const products = await registry.get(productEntity.config.name).findAll({
    where: { id: items.map((item) => item.productId) },
    lock: transaction.LOCK.UPDATE,
    transaction,
  });
  for (const product of products) {
    const returned = items
      .filter((item) => item.productId === product.get('id'))
      .reduce((sum, item) => sum + item.quantity, 0);
    await product.update(
      { stockCount: Number(product.get('stockCount')) + returned },
      { transaction }
    );
  }
}

/** The parcel's link from the order's shipping method, if it still exists and has one. */
async function findTrackingUrl(
  registry: ModelRegistry,
  shippingMethod: string,
  trackingNumber: string | undefined,
  transaction: Transaction
): Promise<string | null> {
  if (!trackingNumber) return null;
  const method = await registry
    .get(shippingMethodEntity.config.name)
    .findOne({ where: { code: shippingMethod }, transaction });
  return trackingUrlFor(method?.get('trackingUrl') as string | null, trackingNumber) ?? null;
}

/**
 * The customer's e-mail about the action, worded as the admin set it. A delivered order's e-mail
 * invites the customer to review it.
 */
async function findActionEmail(
  { registry, jwtSecret, siteUrl }: OrderActionsPluginOptions,
  action: OrderAction,
  saved: Order,
  event: OrderEvent
): Promise<{ enabled: boolean; to: string; content: EmailContent } | undefined> {
  if (!isEmailTemplateKey(action)) return undefined;
  const placed: PlacedOrder = { ...saved, items: parseOrderItems(saved) };
  const { enabled, text } = await resolveEmailText(registry, action);
  const details: ActionDetails = {
    ...event,
    trackingUrl: saved.trackingUrl ?? undefined,
    ...(action === 'mark-delivered' &&
      (await reviewInvitationDetails(registry, { jwtSecret, siteUrl }, saved.id))),
  };
  const content = orderActionEmail(action, placed, details, text);
  return { enabled, to: saved.customerEmail, content };
}

/**
 * `POST /api/orders/:id/actions/:action` — the signed-in admin takes an order a step further
 * (`ORDER_ACTIONS`): the statuses move, a cancelled order's pieces go back in stock, the step is
 * written to the order's history and the customer is e-mailed (`notify: false` to skip it).
 * Refused with 409 when the order isn't in a state the action fits. Answers the updated order.
 */
export function createOrderActionsPlugin(options: OrderActionsPluginOptions): ProjectPlugin {
  const { registry, jwtSecret, siteUrl } = options;
  return {
    registerRoutes(app, sequelize, _models, emailService) {
      app.post(
        ORDER_ACTION_ROUTE,
        createVerifyToken(jwtSecret),
        asyncHandler(async (req, res) => {
          const action = req.params.action as OrderAction;
          if (!ORDER_ACTIONS.includes(action)) throw new HttpError(NOT_FOUND, 'Unknown action');
          const request = readActionRequest(req.body);
          const orders = registry.get(orderEntity.config.name);

          const { order, event } = await sequelize.transaction(async (transaction) => {
            const row = await orders.findByPk(req.params.id, {
              lock: transaction.LOCK.UPDATE,
              transaction,
            });
            if (!row) throw new HttpError(NOT_FOUND, 'Order not found');
            const stored = row.toJSON() as Order;
            if (!availableActions(stored as OrderState).includes(action)) {
              throw new HttpError(CONFLICT, 'Tohle teď s objednávkou udělat nejde.');
            }

            const trackingNumber = request.trackingNumber?.trim() || undefined;
            const restocked = action === 'cancel' && request.restock !== false;
            if (restocked) await restock(registry, parseOrderItems(stored), transaction);

            const event: OrderEvent = {
              type: action,
              at: new Date().toISOString(),
              ...(trackingNumber && { trackingNumber }),
              ...(request.message?.trim() && { message: request.message.trim() }),
              ...(action === 'cancel' && { restocked }),
            };
            await row.update(
              {
                ...applyAction(stored as OrderState, action),
                ...(action === 'ship' && {
                  trackingNumber: trackingNumber ?? null,
                  trackingUrl: await findTrackingUrl(
                    registry,
                    stored.shippingMethod,
                    trackingNumber,
                    transaction
                  ),
                }),
                history: JSON.stringify([...parseOrderHistory(stored), event]),
              },
              { transaction }
            );
            return { order: row, event };
          });

          // The e-mail goes after the change is saved; how it went is noted on the same line.
          const email = await findActionEmail(options, action, order.toJSON() as Order, event);
          if (email) {
            const sends = request.notify !== false && email.enabled;
            const footer = sends && { siteUrl, sellerLine: await resolveSellerLine(registry) };
            event.email = footer
              ? await sendEmail(emailService, email.to, email.content, footer)
              : 'skipped';
            const history = parseOrderHistory(order.toJSON() as Order);
            history[history.length - 1] = event;
            await order.update({ history: JSON.stringify(history) });
          }
          res.json(order.toJSON());
        })
      );
    },
  };
}
