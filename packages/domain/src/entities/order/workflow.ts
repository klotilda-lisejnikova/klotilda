import type { OrderStatus, PaymentStatus, ShippingMethod } from '../../constants';

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
  shippingMethod: ShippingMethod;
}

const PICKUP: ShippingMethod = 'osobni_odber';
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
    order.shippingMethod !== PICKUP &&
    BEING_PREPARED.includes(order.orderStatus),
  'ready-for-pickup': (order) =>
    order.paymentStatus === 'paid' &&
    order.shippingMethod === PICKUP &&
    BEING_PREPARED.includes(order.orderStatus),
  'mark-delivered': (order) => HANDED_OVER.includes(order.orderStatus),
  cancel: (order) => CANCELLABLE.includes(order.orderStatus),
  'mark-refunded': (order) => order.paymentStatus === 'paid' && order.orderStatus === 'cancelled',
};

/** The actions the order allows now, in the order the admin usually takes them. */
export function availableActions(order: OrderState): OrderAction[] {
  return ORDER_ACTIONS.filter((action) => ALLOWED[action](order));
}

/** The statuses an action leaves the order in. */
export function applyAction(
  order: OrderState,
  action: OrderAction
): Pick<OrderState, 'paymentStatus' | 'orderStatus'> {
  const { paymentStatus, orderStatus } = order;
  switch (action) {
    case 'mark-paid':
      return { paymentStatus: 'paid', orderStatus: orderStatus === 'new' ? 'processing' : orderStatus };
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

/** One line of an order's history. */
export interface OrderEvent {
  type: 'placed' | OrderAction;
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

/** Where a customer follows a parcel, per carrier. */
export const TRACKING_URLS: Partial<Record<ShippingMethod, (trackingNumber: string) => string>> = {
  zasilkovna: (number) => `https://tracking.packeta.com/cs/?id=${encodeURIComponent(number)}`,
  ceska_posta: (number) =>
    `https://www.postaonline.cz/trackandtrace/-/zasilka/cislo?parcelNumbers=${encodeURIComponent(number)}`,
};
