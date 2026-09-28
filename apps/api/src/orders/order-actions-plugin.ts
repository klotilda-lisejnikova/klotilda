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
  ORDER_ACTION_ROUTE,
  ORDER_ACTIONS,
  orderActionFields,
  orderEntity,
  parseOrderHistory,
  parseOrderItems,
  productEntity,
} from '@klotilda/domain';
import type {
  Order,
  OrderAction,
  OrderActionRequest,
  OrderEvent,
  OrderItem,
  OrderState,
} from '@klotilda/domain';
import { ORDER_ACTION_EMAILS } from '../emails/order-emails';
import type { PlacedOrder } from '../emails/order-emails';
import { sendEmail } from '../emails/send-email';
import { asyncHandler } from '../http/async-handler';
import type { ModelRegistry } from '../models-registry';

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

/**
 * `POST /api/orders/:id/actions/:action` — the signed-in admin takes an order a step further
 * (`ORDER_ACTIONS`): the statuses move, a cancelled order's pieces go back in stock, the step is
 * written to the order's history and the customer is e-mailed (`notify: false` to skip it).
 * Refused with 409 when the order isn't in a state the action fits. Answers the updated order.
 */
export function createOrderActionsPlugin({
  registry,
  jwtSecret,
  siteUrl,
}: OrderActionsPluginOptions): ProjectPlugin {
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
                ...(action === 'ship' && { trackingNumber: trackingNumber ?? null }),
                history: JSON.stringify([...parseOrderHistory(stored), event]),
              },
              { transaction }
            );
            return { order: row, event };
          });

          // The e-mail goes after the change is saved; how it went is noted on the same line.
          const template = ORDER_ACTION_EMAILS[action];
          if (template) {
            const saved = order.toJSON() as Order;
            const placed: PlacedOrder = { ...saved, items: parseOrderItems(saved) };
            event.email =
              request.notify === false
                ? 'skipped'
                : await sendEmail(
                    emailService,
                    saved.customerEmail,
                    template(placed, event),
                    siteUrl
                  );
            const history = parseOrderHistory(saved);
            history[history.length - 1] = event;
            await order.update({ history: JSON.stringify(history) });
          }
          res.json(order.toJSON());
        })
      );
    },
  };
}
