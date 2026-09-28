import type { Fields } from '@eleansphere/entity-core';
import { DEFAULT_STOCK_COUNT, TITLE_MAX_LENGTH } from '../../constants';

export const productFields = {
  name_cs: { type: 'STRING', required: true, maxLength: TITLE_MAX_LENGTH },
  name_en: { type: 'STRING', maxLength: TITLE_MAX_LENGTH },
  description_cs: { type: 'TEXT' },
  description_en: { type: 'TEXT' },
  /** CZK. */
  price: { type: 'FLOAT', required: true, min: 0 },
  /** A category still holding products can't be deleted. */
  categoryId: { type: 'STRING', references: { model: 'Category' } },
  stockCount: { type: 'INTEGER', default: DEFAULT_STOCK_COUNT, min: 0 },
  /** Hidden from the shop while false; the admin still sees it. */
  active: { type: 'BOOLEAN', default: true },
} as const satisfies Fields;
