import { describe, expect, it } from 'vitest';
import { validateFields } from '@eleansphere/schema';
import {
  customerFields,
  orderFields,
  parseOrderItems,
  SHIPPING_METHODS,
  SHIPPING_PRICES,
} from './index';

describe('Shipping', () => {
  it('has a price for every method the checkout offers, and no other', () => {
    expect([...SHIPPING_METHODS].sort()).toEqual(Object.keys(SHIPPING_PRICES).sort());
  });
});

describe('Orders', () => {
  it("keep what the customer sent and what the server worked out: only the statuses change", () => {
    const writable = Object.entries(orderFields)
      .filter(([, field]) => !('readOnly' in field && field.readOnly))
      .map(([name]) => name);
    expect(writable.sort()).toEqual(['orderStatus', 'paymentStatus']);
  });

  it('check the customer with the same rules the checkout uses', () => {
    const issues = validateFields(
      customerFields,
      { customerFirstName: 'Jana', customerEmail: 'nope', shippingMethod: 'drone' },
      { mode: 'create' }
    );
    expect(issues.map(({ path, code }) => `${path}:${code}`)).toEqual(
      expect.arrayContaining([
        'customerLastName:required',
        'customerEmail:format',
        'shippingMethod:enum',
        'street:required',
      ])
    );
  });

  it('read their stored items back', () => {
    const items = [{ productId: 'prod1', name: 'Váza', price: 1200, quantity: 1 }];
    expect(parseOrderItems({ items: JSON.stringify(items) })).toEqual(items);
  });
});
