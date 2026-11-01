import { defineEntity } from '@eleansphere/entity-core';
import type { ReorderRequest } from '../../ordering';
import { shippingMethodFields } from './fields';

export const SHIPPING_METHODS_PATH = '/api/shipping-methods';
export const SHIPPING_METHOD_ORDER = 'sortOrder,name_cs';
/** `PUT` with `{ ids }`, every method; `all` keeps it clear of `PUT /api/shipping-methods/:id`. */
export const SHIPPING_METHODS_ORDER_ROUTE = '/api/shipping-methods/all/order';
/** Stands for the parcel number in a method's `trackingUrl`. */
export const TRACKING_NUMBER_PLACEHOLDER = '{number}';

/**
 * How an order travels and what it costs — Zásilkovna, Česká pošta, pickup in Prague, … The
 * admin defines them; the shop offers the active ones and the checkout charges their price. An
 * order keeps the method's code, name and kind as they were, so editing or deleting a method
 * never changes an order placed with it.
 */
export const shippingMethodEntity = defineEntity({
  name: 'ShippingMethod',
  prefix: 'shp',
  basePath: SHIPPING_METHODS_PATH,
  access: { read: 'public', write: 'auth' },
  fields: shippingMethodFields,
  query: {
    filter: { active: 'eq' },
    sort: ['sortOrder', 'name_cs', 'price', 'createdAt'],
    defaultSort: SHIPPING_METHOD_ORDER,
    defaultLimit: 100,
    maxLimit: 100,
  },
  extend: (Base) =>
    class extends Base {
      /** Puts every method in the order of `ids`. */
      reorder(ids: string[]) {
        const request: ReorderRequest = { ids };
        return this.put<void>(SHIPPING_METHODS_ORDER_ROUTE, request);
      }
    },
});

export type ShippingMethod = InstanceType<typeof shippingMethodEntity.Dto>;

/** The link where a parcel is followed, or `undefined` when the method has none. */
export function trackingUrlFor(
  template: string | null | undefined,
  trackingNumber: string
): string | undefined {
  if (!template?.trim()) return undefined;
  return template
    .trim()
    .replaceAll(TRACKING_NUMBER_PLACEHOLDER, encodeURIComponent(trackingNumber));
}
