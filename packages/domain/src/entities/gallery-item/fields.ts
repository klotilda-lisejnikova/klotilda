import type { Fields } from '@eleansphere/entity-core';
import { GALLERY_ROWS, TITLE_MAX_LENGTH } from '../../constants';

export const galleryItemFields = {
  title_cs: { type: 'STRING', required: true, maxLength: TITLE_MAX_LENGTH },
  title_en: { type: 'STRING', maxLength: TITLE_MAX_LENGTH },
  /** Only a badge on the picture; the same categories as the shop. */
  categoryId: { type: 'STRING', references: { model: 'Category' } },
  /** Which of the landing page's two rows the picture sits in. */
  row: { type: 'INTEGER', default: GALLERY_ROWS[0], min: GALLERY_ROWS[0], max: GALLERY_ROWS[1] },
  sortOrder: { type: 'INTEGER', default: 0, min: 0 },
  active: { type: 'BOOLEAN', default: true },
} as const satisfies Fields;
