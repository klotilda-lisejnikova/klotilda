import type { Fields } from '@eleansphere/entity-core';

export const CATEGORY_SLUG_MAX_LENGTH = 60;
const CATEGORY_NAME_MAX_LENGTH = 100;

export const categoryFields = {
  /** In the shop's address, `?category=keramika`. The API normalizes it with `toSlug`. */
  slug: { type: 'STRING', required: true, unique: true, maxLength: CATEGORY_SLUG_MAX_LENGTH },
  name_cs: { type: 'STRING', required: true, maxLength: CATEGORY_NAME_MAX_LENGTH },
  name_en: { type: 'STRING', maxLength: CATEGORY_NAME_MAX_LENGTH },
  /** The order of the shop's filters. */
  sortOrder: { type: 'INTEGER', default: 0, min: 0 },
} as const satisfies Fields;
