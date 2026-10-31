import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { OrderStatus, PaymentStatus } from '@klotilda/domain';
import { isPaymentOverdue, ORDER_STAGES, overdueCutoff } from './order-stages';

const NOW = new Date('2026-10-31T12:00:00Z');
const AWAITING = ORDER_STAGES.find((stage) => stage.value === 'awaiting-payment')!;

const order = (
  paymentStatus: PaymentStatus,
  orderStatus: OrderStatus,
  createdAt = overdueCutoff().toISOString()
) => ({ paymentStatus, orderStatus, createdAt });

describe('isPaymentOverdue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  it('flags exactly the orders the overview counts: awaiting payment, placed by the cutoff', () => {
    const cutoff = overdueCutoff().getTime();
    for (const paymentStatus of ['pending', 'failed', 'paid', 'refunded'] as PaymentStatus[]) {
      for (const orderStatus of ['new', 'processing', 'shipped', 'cancelled'] as OrderStatus[]) {
        const counted =
          AWAITING.filter.paymentStatus!.includes(paymentStatus) &&
          AWAITING.filter.orderStatus!.includes(orderStatus);
        expect(isPaymentOverdue(order(paymentStatus, orderStatus))).toBe(counted);
      }
    }
    const justAfter = new Date(cutoff + 1).toISOString();
    expect(isPaymentOverdue(order('pending', 'new', justAfter))).toBe(false);
  });
});
