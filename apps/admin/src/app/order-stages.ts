import type { OrderStatus, PaymentStatus } from '@klotilda/domain';

/** The tabs of the orders list: where in its life an order is, as status filters. */
export interface OrderStage {
  value: string;
  label: string;
  filter: { paymentStatus?: PaymentStatus[]; orderStatus?: OrderStatus[] };
  /** The tab shows how many orders wait in it. */
  counted?: boolean;
}

const OPEN: OrderStatus[] = ['new', 'processing'];

export const ORDER_STAGES: OrderStage[] = [
  {
    value: 'awaiting-payment',
    label: 'Čeká na platbu',
    filter: { paymentStatus: ['pending', 'failed'], orderStatus: OPEN },
    counted: true,
  },
  {
    value: 'to-prepare',
    label: 'K odeslání',
    filter: { paymentStatus: ['paid'], orderStatus: OPEN },
    counted: true,
  },
  { value: 'handed-over', label: 'Odesláno', filter: { orderStatus: ['shipped', 'ready'] } },
  { value: 'done', label: 'Hotové', filter: { orderStatus: ['delivered'] } },
  { value: 'cancelled', label: 'Zrušené', filter: { orderStatus: ['cancelled'] } },
  { value: 'all', label: 'Všechny', filter: {} },
];

export const DEFAULT_STAGE = ORDER_STAGES[0].value;

/** Past this many days an unpaid order is flagged in the list. */
export const UNPAID_WARNING_DAYS = 5;

export function daysSince(value: string | Date): number {
  return Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000);
}
