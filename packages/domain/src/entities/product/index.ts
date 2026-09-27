import { defineEntity, withImages } from '@eleansphere/entity-core';
import type { FileDto } from '@eleansphere/entity-core';
import { FILE_REF_TYPES } from '../../constants';
import { productFields } from './fields';

export const PRODUCTS_PATH = '/api/products';

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
    filter: { category: 'eq', active: 'eq' },
    sort: ['createdAt', 'price', 'name_cs'],
    defaultSort: '-createdAt',
    search: ['name_cs', 'name_en'],
    defaultLimit: 50,
    maxLimit: 200,
  },
  extend: (Base) => class extends withImages(Base, FILE_REF_TYPES.product) {},
});

export type Product = InstanceType<typeof productEntity.Dto>;

/** A product as the API returns it: with its photos, in their order. */
export type ProductWithImages = Product & { images: FileDto[] };
