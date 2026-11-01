import type { Fields } from '@eleansphere/entity-core';

const NAME_MAX_LENGTH = 120;
const ICO_MAX_LENGTH = 20;
const ADDRESS_MAX_LENGTH = 200;
const EMAIL_MAX_LENGTH = 254;
const PHONE_MAX_LENGTH = 40;
const REGISTRATION_MAX_LENGTH = 200;

export const sellerFields = {
  /** The name the trade licence is issued to. */
  name: { type: 'STRING', required: true, maxLength: NAME_MAX_LENGTH },
  /** Identification number (IČO). */
  ico: { type: 'STRING', required: true, maxLength: ICO_MAX_LENGTH },
  /** The registered place of business. */
  address: { type: 'STRING', required: true, maxLength: ADDRESS_MAX_LENGTH },
  email: { type: 'STRING', required: true, format: 'email', maxLength: EMAIL_MAX_LENGTH },
  phone: { type: 'STRING', maxLength: PHONE_MAX_LENGTH },
  /** How the seller is registered, e.g. "fyzická osoba podnikající podle živnostenského zákona". */
  registration: { type: 'STRING', maxLength: REGISTRATION_MAX_LENGTH },
  /** Until true, the legal pages say the seller's details are still to be filled in. */
  complete: { type: 'BOOLEAN', default: false },
} as const satisfies Fields;
