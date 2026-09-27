import { defineEntity } from '@eleansphere/entity-core';
import type { InferCreateDto } from '@eleansphere/entity-core';
import { orderFields } from './fields';
import type { customerFields } from './fields';

export const ORDERS_PATH = '/api/orders';
/** Where the shop places an order: public, and the only way an order comes to be. */
export const CHECKOUT_PATH = '/api/checkout';
/** The most pieces of one product a single order can ask for. */
export const MAX_ITEM_QUANTITY = 20;
export const MAX_ORDER_LINES = 50;

/** One line of a stored order, as it was when ordered. */
export interface OrderItem {
  productId: string;
  name: string;
  /** CZK a piece. */
  price: number;
  quantity: number;
}

/** A line of the cart as the shop sends it: which product and how many. Prices are the server's. */
export interface CheckoutItem {
  productId: string;
  quantity: number;
}

/** `POST /api/checkout` */
export type CheckoutRequest = InferCreateDto<typeof customerFields> & { items: CheckoutItem[] };

/** What the shop shows after checkout: how to pay. */
export interface CheckoutResponse {
  orderId: string;
  variableSymbol: string;
  /** CZK, shipping included. */
  amount: number;
  bankAccount: string;
  /** A QR payment code (SPD) as a PNG data URL. */
  qrCodeDataUrl: string;
}

/**
 * Orders from the shop. They are placed through `POST /api/checkout`; the admin lists them and
 * records payment and shipping through the CRUD routes, which never create one.
 */
export const orderEntity = defineEntity({
  name: 'Order',
  prefix: 'ord',
  basePath: ORDERS_PATH,
  access: { read: 'auth', write: 'auth' },
  fields: orderFields,
  query: {
    filter: { paymentStatus: 'eq', orderStatus: 'eq' },
    sort: ['createdAt', 'totalAmount'],
    defaultSort: '-createdAt',
    search: ['customerLastName', 'customerEmail', 'variableSymbol'],
    defaultLimit: 50,
    maxLimit: 200,
  },
  extend: (Base) =>
    class extends Base {
      checkout(request: CheckoutRequest) {
        return this.post<CheckoutResponse>(CHECKOUT_PATH, request);
      }
    },
});

export type Order = InstanceType<typeof orderEntity.Dto>;

/** The stored `items` column, read back. */
export function parseOrderItems(order: Pick<Order, 'items'>): OrderItem[] {
  return JSON.parse(order.items) as OrderItem[];
}
