import type { Fields } from '@eleansphere/entity-core';
import {
  DEFAULT_ORDER_STATUS,
  DEFAULT_PAYMENT_STATUS,
  ORDER_STATUSES,
  PAYMENT_KINDS,
  PAYMENT_STATUSES,
  PICKUP_POINT_TYPES,
  SHIPPING_KINDS,
} from '../../constants';
import { CODE_MAX_LENGTH } from '../../codes';
import { LEGAL_VERSION_MAX_LENGTH } from '../legal-document/fields';
import { PICKUP_POINT_ID_MAX_LENGTH } from '../../pickup-points';

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
  /** A `ShippingMethod`'s code; the checkout refuses one that isn't offered. */
  shippingMethod: { type: 'STRING', required: true, maxLength: CODE_MAX_LENGTH },
  /** A `PaymentMethod`'s code; the checkout refuses one that isn't offered or doesn't fit. */
  paymentMethod: { type: 'STRING', required: true, maxLength: CODE_MAX_LENGTH },
  /**
   * The carrier's id of the pickup point chosen on its map, for a method with a `pickupNetwork`
   * (else ignored). The checkout asks the carrier about it and stores what the carrier answers.
   */
  pickupPointId: { type: 'STRING', maxLength: PICKUP_POINT_ID_MAX_LENGTH },
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
  /** The shipping method's name and kind when ordered, so editing the method changes no order. */
  shippingName: { type: 'STRING', required: true, readOnly: true },
  shippingKind: { type: 'ENUM', values: SHIPPING_KINDS, required: true, readOnly: true },
  shippingPrice: { type: 'FLOAT', default: 0, readOnly: true },
  /** The pickup point as the carrier described it when ordered; empty without one. */
  pickupPointName: { type: 'STRING', readOnly: true },
  /** Its street, zip and city, one line. */
  pickupPointAddress: { type: 'STRING', readOnly: true },
  pickupPointType: { type: 'ENUM', values: PICKUP_POINT_TYPES, readOnly: true },
  /** The payment method's name, kind and fee when ordered, the same way. */
  paymentName: { type: 'STRING', required: true, readOnly: true },
  paymentKind: { type: 'ENUM', values: PAYMENT_KINDS, required: true, readOnly: true },
  paymentFee: { type: 'FLOAT', default: 0, readOnly: true },
  /**
   * The ordered `OrderItem[]` as JSON: name and price as they were when ordered, so an order
   * doesn't change when its product does.
   */
  items: { type: 'TEXT', required: true, readOnly: true },
  totalAmount: { type: 'FLOAT', required: true, readOnly: true },
  /**
   * Numeric, for the bank transfer: incoming payments are matched to orders by it (order ids
   * aren't numeric). Every order has one; customers know their order by it.
   */
  variableSymbol: { type: 'STRING', required: true, readOnly: true },
  paymentStatus: { type: 'ENUM', values: PAYMENT_STATUSES, default: DEFAULT_PAYMENT_STATUS },
  orderStatus: { type: 'ENUM', values: ORDER_STATUSES, default: DEFAULT_ORDER_STATUS },
  /** The carrier's parcel number, set when the order is shipped. */
  trackingNumber: { type: 'STRING', maxLength: TRACKING_NUMBER_MAX_LENGTH, readOnly: true },
  /** Where the parcel is followed, made from the method's `trackingUrl` when shipped. */
  trackingUrl: { type: 'TEXT', readOnly: true },
  /** What happened to the order, as `OrderEvent[]` JSON, oldest first. Empty on older orders. */
  history: { type: 'TEXT', readOnly: true },
  /** The terms the customer agreed to at checkout (a `LegalDocumentVersion` of them), and when. */
  termsVersion: { type: 'STRING', maxLength: LEGAL_VERSION_MAX_LENGTH, readOnly: true },
  termsAcceptedAt: { type: 'DATE', readOnly: true },
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
