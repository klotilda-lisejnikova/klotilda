import type { OrderStatus, PaymentKind, PaymentStatus, ShippingKind } from '../../constants';

/**
 * What the admin does with an order, one step at a time. Each action checks the order is in a
 * state where it makes sense, moves the statuses, is written to the order's history and — unless
 * turned off — e-mails the customer.
 */
export const ORDER_ACTIONS = [
  'mark-paid',
  'ship',
  'ready-for-pickup',
  'mark-delivered',
  'cancel',
  'mark-refunded',
] as const;
export type OrderAction = (typeof ORDER_ACTIONS)[number];

/** `POST /api/orders/:id/actions/:action` */
export const ORDER_ACTION_ROUTE = '/api/orders/:id/actions/:action';

export interface OrderActionRequest {
  notify?: boolean;
  message?: string;
  trackingNumber?: string;
  restock?: boolean;
}

/** The part of an order that decides what can happen next. */
export interface OrderState {
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  shippingKind: ShippingKind;
  paymentKind: PaymentKind;
}

const PICKUP: ShippingKind = 'pickup';
/** Paid in cash when picked up, so it is made ready before the money comes. */
const paysAtPickup = (order: OrderState) =>
  order.paymentKind === 'cash' &&
  (order.paymentStatus === 'pending' || order.paymentStatus === 'failed');
/** Paid for, not yet handed over. */
const BEING_PREPARED: readonly OrderStatus[] = ['new', 'processing'];
const HANDED_OVER: readonly OrderStatus[] = ['shipped', 'ready'];
const CANCELLABLE: readonly OrderStatus[] = ['new', 'processing', 'ready'];

const ALLOWED: Record<OrderAction, (order: OrderState) => boolean> = {
  'mark-paid': (order) =>
    (order.paymentStatus === 'pending' || order.paymentStatus === 'failed') &&
    order.orderStatus !== 'cancelled',
  ship: (order) =>
    order.paymentStatus === 'paid' &&
    order.shippingKind !== PICKUP &&
    BEING_PREPARED.includes(order.orderStatus),
  'ready-for-pickup': (order) =>
    (order.paymentStatus === 'paid' || paysAtPickup(order)) &&
    order.shippingKind === PICKUP &&
    BEING_PREPARED.includes(order.orderStatus),
  // Cash is taken ("Platba dorazila") before the pieces count as handed over.
  'mark-delivered': (order) => HANDED_OVER.includes(order.orderStatus) && !paysAtPickup(order),
  cancel: (order) => CANCELLABLE.includes(order.orderStatus),
  'mark-refunded': (order) => order.paymentStatus === 'paid' && order.orderStatus === 'cancelled',
};

/**
 * The actions the order allows now, in the order the admin usually takes them: a cash order is
 * made ready before its payment is taken.
 */
export function availableActions(order: OrderState): OrderAction[] {
  const allowed = ORDER_ACTIONS.filter((action) => ALLOWED[action](order));
  if (!paysAtPickup(order)) return allowed;
  const first: OrderAction = 'ready-for-pickup';
  return allowed.includes(first)
    ? [first, ...allowed.filter((action) => action !== first)]
    : allowed;
}

/** The statuses an action leaves the order in. */
export function applyAction(
  order: OrderState,
  action: OrderAction
): Pick<OrderState, 'paymentStatus' | 'orderStatus'> {
  const { paymentStatus, orderStatus } = order;
  switch (action) {
    case 'mark-paid':
      return {
        paymentStatus: 'paid',
        orderStatus: orderStatus === 'new' ? 'processing' : orderStatus,
      };
    case 'ship':
      return { paymentStatus, orderStatus: 'shipped' };
    case 'ready-for-pickup':
      return { paymentStatus, orderStatus: 'ready' };
    case 'mark-delivered':
      return { paymentStatus, orderStatus: 'delivered' };
    case 'cancel':
      return { paymentStatus, orderStatus: 'cancelled' };
    case 'mark-refunded':
      return { paymentStatus: 'refunded', orderStatus };
  }
}

/** What the customer's e-mail did: sent, failed (logged on the server), or not sent on purpose. */
export type EmailOutcome = 'sent' | 'failed' | 'skipped';

/** One line of an order's history; `review-request` is the review link e-mailed again. */
export interface OrderEvent {
  type: 'placed' | OrderAction | 'review-request';
  /** ISO timestamp. */
  at: string;
  email?: EmailOutcome;
  trackingNumber?: string;
  message?: string;
  /** A cancelled order's pieces went back in stock. */
  restocked?: boolean;
}

/** The stored `history` column, read back; older orders have none. */
export function parseOrderHistory(order: { history?: string | null }): OrderEvent[] {
  return order.history ? (JSON.parse(order.history) as OrderEvent[]) : [];
}
