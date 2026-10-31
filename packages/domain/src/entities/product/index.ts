import { defineEntity, withImages } from '@eleansphere/entity-core';
import type { FileDto } from '@eleansphere/entity-core';
import { FILE_REF_TYPES } from '../../constants';
import type { ReorderRequest } from '../../ordering';
import type { CategorySummary } from '../category';
import { productFields } from './fields';

export const PRODUCTS_PATH = '/api/products';
/** `PUT` with `{ ids }`, every photo of the product: they are shown in that order from then on. */
export const PRODUCT_IMAGE_ORDER_ROUTE = '/api/products/:id/images/order';

/**
 * The artist's originals for sale. Anyone reads the active ones; the admin reads all and writes.
 * Photos are `File` rows (`refType: 'Product'`, `role: 'image'`), attached as `images`.
 */
export const productEntity = defineEntity({
  name: 'Product',
  prefix: 'prod',
  basePath: PRODUCTS_PATH,
  access: { read: 'public', write: 'auth' },
  fields: productFields,
  query: {
    filter: { categoryId: 'eq', active: 'eq' },
    sort: ['createdAt', 'price', 'name_cs'],
    defaultSort: '-createdAt',
    search: ['name_cs', 'name_en'],
    defaultLimit: 50,
    maxLimit: 200,
  },
  extend: (Base) =>
    class extends withImages(Base, FILE_REF_TYPES.product) {
      /** Puts the product's photos in the order of `ids`; the first is the main one. */
      reorderImages(id: string, ids: string[]) {
        const request: ReorderRequest = { ids };
        return this.put<void>(
          PRODUCT_IMAGE_ORDER_ROUTE.replace(':id', encodeURIComponent(id)),
          request
        );
      }
    },
});

export type Product = InstanceType<typeof productEntity.Dto>;

/** A product as the API returns it: with its photos, in their order, and its category. */
export type ProductWithImages = Product & {
  images: FileDto[];
  category: CategorySummary | null;
};
