import { describe, expect, it } from 'vitest';
import type { Order } from '@klotilda/domain';
import { ApiError } from '@eleansphere/entity-core';
import { actOnOrders, BULK_ACTIONS, commonBulkActions } from './bulk-actions';

const order = (state: Pick<Order, 'paymentStatus' | 'orderStatus' | 'shippingMethod'>) =>
  state as Order;

describe('Bulk order actions', () => {
  it('offer what every selected order allows, never cancelling or refunding', () => {
    const unpaid = order({
      paymentStatus: 'pending',
      orderStatus: 'new',
      shippingMethod: 'zasilkovna',
    });
    const paidPost = order({
      paymentStatus: 'paid',
      orderStatus: 'processing',
      shippingMethod: 'ceska_posta',
    });
    const paidPickup = order({
      paymentStatus: 'paid',
      orderStatus: 'processing',
      shippingMethod: 'osobni_odber',
    });
    const cancelledPaid = order({
      paymentStatus: 'paid',
      orderStatus: 'cancelled',
      shippingMethod: 'zasilkovna',
    });

    expect(commonBulkActions([unpaid, unpaid])).toEqual(['mark-paid']);
    expect(commonBulkActions([paidPost])).toEqual(['ship']);
    expect(commonBulkActions([paidPost, paidPickup])).toEqual([]);
    expect(commonBulkActions([unpaid, paidPost])).toEqual([]);
    expect(commonBulkActions([cancelledPaid])).toEqual([]);
    expect(commonBulkActions([])).toEqual([]);
  });
});

describe('Acting on several orders', () => {
  const withHistory = (variableSymbol: string, email?: 'sent' | 'failed') =>
    ({
      variableSymbol,
      history: JSON.stringify([{ type: 'mark-paid', at: '2026-10-31T19:00:00Z', email }]),
    }) as unknown as Order;

  it('goes on after a failure and reports it by variable symbol, counting failed e-mails', async () => {
    const orders = [withHistory('111'), withHistory('222'), withHistory('333')];
    const outcome = await actOnOrders(orders, async (order) => {
      if (order.variableSymbol === '222') {
        throw new ApiError(409, 'Conflict', { message: 'Tohle teď s objednávkou udělat nejde.' });
      }
      return withHistory(order.variableSymbol, order.variableSymbol === '333' ? 'failed' : 'sent');
    });
    expect(outcome).toEqual({
      done: 2,
      failed: ['222: Tohle teď s objednávkou udělat nejde.'],
      emailFailed: 1,
    });
  });

  it('never offers cancelling or refunding', () => {
    expect(BULK_ACTIONS).not.toContain('cancel');
    expect(BULK_ACTIONS).not.toContain('mark-refunded');
  });
});
