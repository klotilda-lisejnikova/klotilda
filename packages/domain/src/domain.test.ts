import { describe, expect, it } from 'vitest';
import { validateFields } from '@eleansphere/schema';
import {
  applyAction,
  availableActions,
  customerFields,
  orderFields,
  parseOrderHistory,
  parseOrderItems,
  paymentFitsShipping,
  toCode,
  toSlug,
  trackingUrlFor,
} from './index';
import type { OrderState } from './index';

describe('Order actions', () => {
  const placed: OrderState = {
    paymentStatus: 'pending',
    orderStatus: 'new',
    shippingKind: 'delivery',
    paymentKind: 'bank_transfer',
  };

  it('follow an order from payment to delivery', () => {
    expect(availableActions(placed)).toEqual(['mark-paid', 'cancel']);
    const paid = { ...placed, ...applyAction(placed, 'mark-paid') };
    expect(paid).toMatchObject({ paymentStatus: 'paid', orderStatus: 'processing' });
    expect(availableActions(paid)).toEqual(['ship', 'cancel']);
    const shipped = { ...paid, ...applyAction(paid, 'ship') };
    expect(availableActions(shipped)).toEqual(['mark-delivered']);
    expect(applyAction(shipped, 'mark-delivered').orderStatus).toBe('delivered');
  });

  it('hand a pickup over in person instead of shipping it', () => {
    const paid: OrderState = { ...placed, shippingKind: 'pickup', paymentStatus: 'paid' };
    expect(availableActions(paid)).toEqual(['ready-for-pickup', 'cancel']);
    const ready = { ...paid, ...applyAction(paid, 'ready-for-pickup') };
    expect(ready.orderStatus).toBe('ready');
    expect(availableActions(ready)).toEqual(['mark-delivered', 'cancel']);
  });

  it('make a cash order ready before it is paid, and hand it over once paid', () => {
    const placedForCash: OrderState = { ...placed, shippingKind: 'pickup', paymentKind: 'cash' };
    expect(availableActions(placedForCash)).toEqual(['ready-for-pickup', 'mark-paid', 'cancel']);
    const ready = { ...placedForCash, ...applyAction(placedForCash, 'ready-for-pickup') };
    expect(availableActions(ready)).toEqual(['mark-paid', 'cancel']);
    const paid = { ...ready, ...applyAction(ready, 'mark-paid') };
    expect(paid).toMatchObject({ paymentStatus: 'paid', orderStatus: 'ready' });
    expect(availableActions(paid)).toEqual(['mark-delivered', 'cancel']);
  });

  it('treat a cash order marked failed as still to be paid at the pickup', () => {
    const failed: OrderState = {
      ...placed,
      shippingKind: 'pickup',
      paymentKind: 'cash',
      paymentStatus: 'failed',
    };
    expect(availableActions(failed)).toEqual(['ready-for-pickup', 'mark-paid', 'cancel']);
    expect(availableActions({ ...failed, orderStatus: 'ready' })).toEqual(['mark-paid', 'cancel']);
  });

  it('keep a bank transfer for pickup waiting for the money', () => {
    const pickup: OrderState = { ...placed, shippingKind: 'pickup' };
    expect(availableActions(pickup)).toEqual(['mark-paid', 'cancel']);
  });

  it('refund a paid order only once it is cancelled', () => {
    const paid: OrderState = { ...placed, paymentStatus: 'paid', orderStatus: 'processing' };
    expect(availableActions(paid)).not.toContain('mark-refunded');
    const cancelled = { ...paid, ...applyAction(paid, 'cancel') };
    expect(availableActions(cancelled)).toEqual(['mark-refunded']);
    expect(availableActions({ ...placed, orderStatus: 'cancelled' })).toEqual([]);
  });

  it('read an older order without history as an empty one', () => {
    expect(parseOrderHistory({ history: null })).toEqual([]);
    const events = [{ type: 'placed', at: '2026-09-28T10:00:00.000Z' }];
    expect(parseOrderHistory({ history: JSON.stringify(events) })).toEqual(events);
  });
});

describe('Categories', () => {
  it('turn a name into the slug the shop address uses', () => {
    expect(toSlug('Síťované ubrusy')).toBe('sitovane-ubrusy');
    expect(toSlug('  Výšivka & linoryt! ')).toBe('vysivka-linoryt');
    expect(toSlug('Keramika 2')).toBe('keramika-2');
    expect(toSlug('—')).toBe('');
    expect(toSlug(`${'a'.repeat(59)} b`)).toBe('a'.repeat(59));
  });
});

describe('Orders', () => {
  it('keep what the customer sent and what the server worked out: only the statuses change', () => {
    const writable = Object.entries(orderFields)
      .filter(([, field]) => !('readOnly' in field && field.readOnly))
      .map(([name]) => name);
    expect(writable.sort()).toEqual(['orderStatus', 'paymentStatus']);
  });

  it('check the customer with the same rules the checkout uses', () => {
    const issues = validateFields(
      customerFields,
      { customerFirstName: 'Jana', customerEmail: 'nope', shippingMethod: 'x'.repeat(41) },
      { mode: 'create' }
    );
    expect(issues.map(({ path, code }) => `${path}:${code}`)).toEqual(
      expect.arrayContaining([
        'customerLastName:required',
        'customerEmail:format',
        'shippingMethod:maxLength',
        'paymentMethod:required',
        'street:required',
      ])
    );
  });

  it('read their stored items back', () => {
    const items = [{ productId: 'prod1', name: 'Váza', price: 1200, quantity: 1 }];
    expect(parseOrderItems({ items: JSON.stringify(items) })).toEqual(items);
  });
});

describe('Payment methods', () => {
  it('take cash only at a pickup', () => {
    expect(paymentFitsShipping('cash', 'pickup')).toBe(true);
    expect(paymentFitsShipping('cash', 'delivery')).toBe(false);
    expect(paymentFitsShipping('bank_transfer', 'delivery')).toBe(true);
    expect(paymentFitsShipping('bank_transfer', 'pickup')).toBe(true);
  });
});

describe('Shipping methods', () => {
  it('link a parcel by the method’s template', () => {
    expect(trackingUrlFor('https://tracking.packeta.com/cs/?id={number}', 'Z 123')).toBe(
      'https://tracking.packeta.com/cs/?id=Z%20123'
    );
    expect(trackingUrlFor(null, 'Z 123')).toBeUndefined();
    expect(trackingUrlFor('  ', 'Z 123')).toBeUndefined();
  });

  it('make plain codes, keeping underscores', () => {
    expect(toCode('Osobní odběr – Brno')).toBe('osobni-odber-brno');
    expect(toCode('osobni_odber')).toBe('osobni_odber');
    expect(toCode(' ** ')).toBe('');
  });
});
