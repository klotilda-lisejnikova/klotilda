import type { Fields } from '@eleansphere/entity-core';
import { SHIPPING_KINDS } from '../../constants';

export const SHIPPING_CODE_MAX_LENGTH = 40;
const SHIPPING_NAME_MAX_LENGTH = 100;
const SHIPPING_DESCRIPTION_MAX_LENGTH = 500;
export const TRACKING_URL_MAX_LENGTH = 180;

export const shippingMethodFields = {
  /** What an order names the method by (`zasilkovna`). The API normalizes it with `toShippingCode`. */
  code: { type: 'STRING', required: true, unique: true, maxLength: SHIPPING_CODE_MAX_LENGTH },
  name_cs: { type: 'STRING', required: true, maxLength: SHIPPING_NAME_MAX_LENGTH },
  name_en: { type: 'STRING', maxLength: SHIPPING_NAME_MAX_LENGTH },
  /** A line under the name at checkout, e.g. how long delivery takes. */
  description_cs: { type: 'TEXT', maxLength: SHIPPING_DESCRIPTION_MAX_LENGTH },
  description_en: { type: 'TEXT', maxLength: SHIPPING_DESCRIPTION_MAX_LENGTH },
  /** CZK; the checkout charges it, never what the client sends. */
  price: { type: 'FLOAT', required: true, min: 0 },
  /** Decides what the admin does with a paid order: ship it, or have it ready for pickup. */
  kind: { type: 'ENUM', values: SHIPPING_KINDS, required: true },
  /** Where the customer follows a parcel, `{number}` standing for the parcel number. */
  trackingUrl: { type: 'STRING', maxLength: TRACKING_URL_MAX_LENGTH },
  /** Offered at checkout while true. */
  active: { type: 'BOOLEAN', default: true },
  /** The order of the checkout's choices. */
  sortOrder: { type: 'INTEGER', default: 0, min: 0 },
} as const satisfies Fields;
