import { defineEntity } from '@eleansphere/entity-core';
import type { PaymentKind, ShippingKind } from '../../constants';
import type { ReorderRequest } from '../../ordering';
import { paymentMethodFields } from './fields';

export const PAYMENT_METHODS_PATH = '/api/payment-methods';
export const PAYMENT_METHOD_ORDER = 'sortOrder,name_cs';
/** `PUT` with `{ ids }`, every method; `all` keeps it clear of `PUT /api/payment-methods/:id`. */
export const PAYMENT_METHODS_ORDER_ROUTE = '/api/payment-methods/all/order';

/**
 * How an order is paid — by bank transfer, in cash at pickup, … The admin defines them; the shop
 * offers the active ones that fit the chosen shipping and the checkout adds their fee. An order
 * keeps the method's code, name, kind and fee as they were.
 */
export const paymentMethodEntity = defineEntity({
  name: 'PaymentMethod',
  prefix: 'pay',
  basePath: PAYMENT_METHODS_PATH,
  access: { read: 'public', write: 'auth' },
  fields: paymentMethodFields,
  query: {
    filter: { active: 'eq' },
    sort: ['sortOrder', 'name_cs', 'fee', 'createdAt'],
    defaultSort: PAYMENT_METHOD_ORDER,
    defaultLimit: 100,
    maxLimit: 100,
  },
  extend: (Base) =>
    class extends Base {
      /** Puts every method in the order of `ids`. */
      reorder(ids: string[]) {
        const request: ReorderRequest = { ids };
        return this.put<void>(PAYMENT_METHODS_ORDER_ROUTE, request);
      }
    },
});

export type PaymentMethod = InstanceType<typeof paymentMethodEntity.Dto>;

/** Cash changes hands only in person, so it goes with a pickup; a transfer goes with anything. */
export function paymentFitsShipping(payment: PaymentKind, shipping: ShippingKind): boolean {
  return payment !== 'cash' || shipping === 'pickup';
}
