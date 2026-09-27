import type { Fields } from '@eleansphere/entity-core';
import { DEFAULT_STOCK_COUNT, PRODUCT_CATEGORIES, TITLE_MAX_LENGTH } from '../../constants';

export const productFields = {
  name_cs: { type: 'STRING', required: true, maxLength: TITLE_MAX_LENGTH },
  name_en: { type: 'STRING', maxLength: TITLE_MAX_LENGTH },
  description_cs: { type: 'TEXT' },
  description_en: { type: 'TEXT' },
  /** CZK. */
  price: { type: 'FLOAT', required: true, min: 0 },
  category: { type: 'ENUM', values: PRODUCT_CATEGORIES },
  stockCount: { type: 'INTEGER', default: DEFAULT_STOCK_COUNT, min: 0 },
  /** Hidden from the shop while false; the admin still sees it. */
  active: { type: 'BOOLEAN', default: true },
} as const satisfies Fields;
