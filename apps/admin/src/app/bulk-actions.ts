import { availableActions } from '@klotilda/domain';
import type { Order, OrderAction } from '@klotilda/domain';
import { describeError } from './errors';
import { emailFailed } from './order-actions';

/**
 * What the orders list offers for several orders at once. Cancelling and refunding stay on the
 * order's own page, one at a time: they move money and stock and ask for a message.
 */
export const BULK_ACTIONS: readonly OrderAction[] = [
  'mark-paid',
  'ship',
  'ready-for-pickup',
  'mark-delivered',
];

/** The bulk actions every one of the selected orders allows, in `BULK_ACTIONS` order. */
export function commonBulkActions(orders: readonly Order[]): OrderAction[] {
  if (orders.length === 0) return [];
  return BULK_ACTIONS.filter((action) =>
    orders.every((order) => availableActions(order).includes(action))
  );
}

export interface BulkOutcome {
  done: number;
  /** "<variable symbol>: <what went wrong>", one per order that failed. */
  failed: string[];
  /** Orders acted on whose e-mail to the customer did not go out. */
  emailFailed: number;
}

/** Runs the action on one order: the orders service's `act`, bound to the request. */
export type ActOnOrder = (order: Order) => Promise<Order>;

/** One order after another, so one failure stops nothing; each is reported by its variable symbol. */
export async function actOnOrders(orders: readonly Order[], act: ActOnOrder): Promise<BulkOutcome> {
  const outcome: BulkOutcome = { done: 0, failed: [], emailFailed: 0 };
  for (const order of orders) {
    try {
      const updated = await act(order);
      outcome.done += 1;
      if (emailFailed(updated)) outcome.emailFailed += 1;
    } catch (err) {
      outcome.failed.push(`${order.variableSymbol}: ${describeError(err)}`);
    }
  }
  return outcome;
}
