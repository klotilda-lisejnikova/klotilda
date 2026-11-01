import type { Fields } from '@eleansphere/entity-core';
import { EMAIL_TEMPLATE_KEYS } from './keys';

const SUBJECT_MAX_LENGTH = 200;
const HEADING_MAX_LENGTH = 120;
const BODY_MAX_LENGTH = 4000;

export const emailTemplateFields = {
  /** Which automatic e-mail the row words (`EMAIL_TEMPLATE_KEYS`); fixed, one row each. */
  key: { type: 'ENUM', values: EMAIL_TEMPLATE_KEYS, required: true, unique: true, readOnly: true },
  /** Sent while true; the order confirmation can't be turned off (`EMAIL_TEMPLATES[key].required`). */
  enabled: { type: 'BOOLEAN', default: true },
  subject: { type: 'STRING', required: true, maxLength: SUBJECT_MAX_LENGTH },
  /** The large title at the top of the e-mail. */
  heading: { type: 'STRING', required: true, maxLength: HEADING_MAX_LENGTH },
  /** Plain text, a blank line between paragraphs; `{{…}}` placeholders are filled from the order. */
  body: { type: 'TEXT', maxLength: BODY_MAX_LENGTH },
} as const satisfies Fields;
