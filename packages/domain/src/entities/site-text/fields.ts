import type { Fields } from '@eleansphere/entity-core';
import { SITE_TEXT_KEYS } from './keys';

/** Room for the longest of them, a paragraph about the artist. */
const TEXT_MAX_LENGTH = 2000;

export const siteTextFields = {
  /** The message it replaces (`SITE_TEXT_KEYS`); fixed, one row each. */
  key: { type: 'ENUM', values: SITE_TEXT_KEYS, required: true, unique: true, readOnly: true },
  /** Empty leaves the text out (the second paragraph about the artist may be). */
  text_cs: { type: 'TEXT', maxLength: TEXT_MAX_LENGTH },
  /** Empty shows the Czech text on the English site too: an e-mail address needs no translation. */
  text_en: { type: 'TEXT', maxLength: TEXT_MAX_LENGTH },
} as const satisfies Fields;
