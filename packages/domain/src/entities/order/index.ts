import { defineEntity } from '@eleansphere/entity-core';
import type { InferCreateDto } from '@eleansphere/entity-core';
import type { PaymentKind } from '../../constants';
import { orderFields } from './fields';
import type { customerFields } from './fields';
import { ORDER_ACTION_ROUTE } from './workflow';
import type { OrderAction, OrderActionRequest } from './workflow';

export * from './workflow';

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

/**
 * `POST /api/checkout`. `termsAccepted` must be `true`: the customer ticked that they have read the
 * terms (and the complaints procedure in them); the order stores which version and when.
 */
export type CheckoutRequest = InferCreateDto<typeof customerFields> & {
  items: CheckoutItem[];
  termsAccepted: true;
};

interface PlacedOrderAnswer {
  orderId: string;
  variableSymbol: string;
  /** CZK, shipping and the payment fee included. */
  amount: number;
  paymentKind: PaymentKind;
}

/** What the shop shows after checkout: how to pay — the account and a QR code for a transfer. */
export type CheckoutResponse =
  | (PlacedOrderAnswer & {
      paymentKind: 'bank_transfer';
      bankAccount: string;
      /** A QR payment code (SPD) as a PNG data URL. */
      qrCodeDataUrl: string;
    })
  | (PlacedOrderAnswer & { paymentKind: 'cash' });

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
    // Lists of values: the admin's tabs each cover a few statuses (and keep cash orders, paid
    // only at pickup, out of "awaiting payment"). `createdAt` as a range: the overview reads the
    // paid orders of its months and counts unpaid orders past their days.
    filter: { paymentStatus: 'in', orderStatus: 'in', paymentKind: 'in', createdAt: 'range' },
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

      /** Takes the order a step further (`availableActions`); answers the updated order. */
      act(id: string, action: OrderAction, request: OrderActionRequest = {}) {
        const path = ORDER_ACTION_ROUTE.replace(':id', encodeURIComponent(id)).replace(
          ':action',
          action
        );
        return this.post<Order>(path, request);
      }
    },
});

export type Order = InstanceType<typeof orderEntity.Dto>;

/** The stored `items` column, read back. */
export function parseOrderItems(order: Pick<Order, 'items'>): OrderItem[] {
  return JSON.parse(order.items) as OrderItem[];
}
