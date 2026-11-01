import type { Fields } from '@eleansphere/entity-core';
import { CODE_MAX_LENGTH } from '../../codes';
import { PAYMENT_KINDS } from '../../constants';

const PAYMENT_NAME_MAX_LENGTH = 100;
const PAYMENT_DESCRIPTION_MAX_LENGTH = 500;

export const paymentMethodFields = {
  /** What an order names the method by (`prevod`). The API normalizes it with `toCode`. */
  code: { type: 'STRING', required: true, unique: true, maxLength: CODE_MAX_LENGTH },
  name_cs: { type: 'STRING', required: true, maxLength: PAYMENT_NAME_MAX_LENGTH },
  name_en: { type: 'STRING', maxLength: PAYMENT_NAME_MAX_LENGTH },
  /** A line under the name at checkout. */
  description_cs: { type: 'TEXT', maxLength: PAYMENT_DESCRIPTION_MAX_LENGTH },
  description_en: { type: 'TEXT', maxLength: PAYMENT_DESCRIPTION_MAX_LENGTH },
  /** CZK added to the order's total; the checkout charges it, never what the client sends. */
  fee: { type: 'FLOAT', required: true, min: 0 },
  /** What the shop and the admin do with the order (`PAYMENT_KINDS`). */
  kind: { type: 'ENUM', values: PAYMENT_KINDS, required: true },
  /** Offered at checkout while true. */
  active: { type: 'BOOLEAN', default: true },
  /** The order of the checkout's choices. */
  sortOrder: { type: 'INTEGER', default: 0, min: 0 },
} as const satisfies Fields;
