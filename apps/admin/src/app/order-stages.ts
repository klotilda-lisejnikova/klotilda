import type { Order, OrderStatus, PaymentKind, PaymentStatus } from '@klotilda/domain';

/** The tabs of the orders list: where in its life an order is, as status filters. */
export interface OrderStage {
  value: string;
  label: string;
  filter: {
    paymentStatus?: PaymentStatus[];
    orderStatus?: OrderStatus[];
    paymentKind?: PaymentKind[];
  };
  /** The tab shows how many orders wait in it. */
  counted?: boolean;
}

const OPEN: OrderStatus[] = ['new', 'processing'];
const UNPAID: PaymentStatus[] = ['pending', 'failed'];
/** Paid before the order goes out; cash is only taken at the pickup. */
const PAID_IN_ADVANCE: PaymentKind[] = ['bank_transfer'];

export const ORDER_STAGES: OrderStage[] = [
  {
    value: 'awaiting-payment',
    label: 'Čeká na platbu',
    filter: { paymentStatus: UNPAID, orderStatus: OPEN, paymentKind: PAID_IN_ADVANCE },
    counted: true,
  },
  {
    value: 'to-prepare',
    label: 'K odeslání',
    filter: { paymentStatus: ['paid'], orderStatus: OPEN },
    counted: true,
  },
  {
    value: 'cash-to-prepare',
    label: 'K přípravě, hotově',
    filter: { paymentStatus: UNPAID, orderStatus: OPEN, paymentKind: ['cash'] },
    counted: true,
  },
  { value: 'handed-over', label: 'Odesláno', filter: { orderStatus: ['shipped', 'ready'] } },
  { value: 'done', label: 'Hotové', filter: { orderStatus: ['delivered'] } },
  { value: 'cancelled', label: 'Zrušené', filter: { orderStatus: ['cancelled'] } },
  { value: 'all', label: 'Všechny', filter: {} },
];

/** Past this many days an unpaid order is flagged in the lists. */
export const UNPAID_WARNING_DAYS = 5;
const DAY_MS = 86_400_000;

export function daysSince(value: string | Date): number {
  return Math.floor((Date.now() - new Date(value).getTime()) / DAY_MS);
}

/** Still awaiting payment ("Čeká na platbu") and placed `UNPAID_WARNING_DAYS` or more days ago. */
export function isPaymentOverdue(
  order: Pick<Order, 'paymentStatus' | 'orderStatus' | 'paymentKind' | 'createdAt'>
): boolean {
  return (
    PAID_IN_ADVANCE.includes(order.paymentKind) &&
    UNPAID.includes(order.paymentStatus) &&
    OPEN.includes(order.orderStatus) &&
    daysSince(order.createdAt) >= UNPAID_WARNING_DAYS
  );
}

/** The latest moment an order can have been placed and be overdue (`isPaymentOverdue`) now. */
export function overdueCutoff(now = Date.now()): Date {
  return new Date(now - UNPAID_WARNING_DAYS * DAY_MS);
}
