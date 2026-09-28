import type { Fields } from '@eleansphere/entity-core';
import {
  DEFAULT_ORDER_STATUS,
  DEFAULT_PAYMENT_STATUS,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  SHIPPING_METHODS,
} from '../../constants';

const NAME_MAX_LENGTH = 100;
const EMAIL_MAX_LENGTH = 254;
const PHONE_MAX_LENGTH = 30;
const STREET_MAX_LENGTH = 200;
const CITY_MAX_LENGTH = 100;
const ZIP_MAX_LENGTH = 10;
const NOTES_MAX_LENGTH = 2000;
const TRACKING_NUMBER_MAX_LENGTH = 60;
const ACTION_MESSAGE_MAX_LENGTH = 1000;

/** What the customer fills in at checkout. */
export const customerFields = {
  customerFirstName: { type: 'STRING', required: true, maxLength: NAME_MAX_LENGTH },
  customerLastName: { type: 'STRING', required: true, maxLength: NAME_MAX_LENGTH },
  customerEmail: { type: 'STRING', required: true, format: 'email', maxLength: EMAIL_MAX_LENGTH },
  customerPhone: { type: 'STRING', maxLength: PHONE_MAX_LENGTH },
  street: { type: 'STRING', required: true, maxLength: STREET_MAX_LENGTH },
  city: { type: 'STRING', required: true, maxLength: CITY_MAX_LENGTH },
  zip: { type: 'STRING', required: true, maxLength: ZIP_MAX_LENGTH },
  shippingMethod: { type: 'ENUM', values: SHIPPING_METHODS, required: true },
  notes: { type: 'TEXT', maxLength: NOTES_MAX_LENGTH },
} as const satisfies Fields;

type ReadOnlyFields<T extends Fields> = { [K in keyof T]: T[K] & { readonly readOnly: true } };

function asReadOnly<T extends Fields>(fields: T): ReadOnlyFields<T> {
  return Object.fromEntries(
    Object.entries(fields).map(([name, field]) => [name, { ...field, readOnly: true }])
  ) as ReadOnlyFields<T>;
}

/**
 * A stored order. What the customer sent and what the server worked out stays as it was; the
 * admin only moves the two statuses.
 */
export const orderFields = {
  ...asReadOnly(customerFields),
  shippingPrice: { type: 'FLOAT', default: 0, readOnly: true },
  /**
   * The ordered `OrderItem[]` as JSON: name and price as they were when ordered, so an order
   * doesn't change when its product does.
   */
  items: { type: 'TEXT', required: true, readOnly: true },
  totalAmount: { type: 'FLOAT', required: true, readOnly: true },
  /**
   * Numeric, for the bank transfer: incoming payments are matched to orders by it (order ids
   * aren't numeric).
   */
  variableSymbol: { type: 'STRING', required: true, readOnly: true },
  paymentStatus: { type: 'ENUM', values: PAYMENT_STATUSES, default: DEFAULT_PAYMENT_STATUS },
  orderStatus: { type: 'ENUM', values: ORDER_STATUSES, default: DEFAULT_ORDER_STATUS },
  /** The carrier's parcel number, set when the order is shipped. */
  trackingNumber: { type: 'STRING', maxLength: TRACKING_NUMBER_MAX_LENGTH, readOnly: true },
  /** What happened to the order, as `OrderEvent[]` JSON, oldest first. Empty on older orders. */
  history: { type: 'TEXT', readOnly: true },
} as const satisfies Fields;

/** What the admin may send with an order action (`POST /api/orders/:id/actions/:action`). */
export const orderActionFields = {
  /** E-mail the customer about it; on unless turned off. */
  notify: { type: 'BOOLEAN' },
  /** A few words for the customer, added to the e-mail — e.g. where to pick the parcel up. */
  message: { type: 'TEXT', maxLength: ACTION_MESSAGE_MAX_LENGTH },
  trackingNumber: { type: 'STRING', maxLength: TRACKING_NUMBER_MAX_LENGTH },
  /** Cancelling puts the pieces back in stock; on unless turned off. */
  restock: { type: 'BOOLEAN' },
} as const satisfies Fields;
