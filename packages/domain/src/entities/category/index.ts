import { defineEntity } from '@eleansphere/entity-core';
import { CATEGORY_SLUG_MAX_LENGTH, categoryFields } from './fields';

export const CATEGORIES_PATH = '/api/categories';
export const CATEGORY_ORDER = 'sortOrder,name_cs';

/**
 * What the artist makes — ceramics, embroidery, … Products and gallery pictures point at one
 * (`categoryId`); a category still in use can't be deleted. Anyone reads them, the admin writes.
 * The shop shows only the categories that have something on offer.
 */
export const categoryEntity = defineEntity({
  name: 'Category',
  prefix: 'cat',
  basePath: CATEGORIES_PATH,
  access: { read: 'public', write: 'auth' },
  fields: categoryFields,
  query: {
    sort: ['sortOrder', 'name_cs', 'createdAt'],
    defaultSort: CATEGORY_ORDER,
    defaultLimit: 200,
    maxLimit: 200,
  },
});

export type Category = InstanceType<typeof categoryEntity.Dto>;

/** The category a product or gallery picture carries in API responses, next to its `categoryId`. */
export type CategorySummary = Pick<Category, 'id' | 'slug' | 'name_cs' | 'name_en' | 'sortOrder'>;

/**
 * `"Síťované ubrusy"` → `"sitovane-ubrusy"`: lower case, no diacritics, words joined by dashes.
 * Empty when nothing usable is left.
 */
export function toSlug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, CATEGORY_SLUG_MAX_LENGTH)
    .replace(/-+$/, '');
}
