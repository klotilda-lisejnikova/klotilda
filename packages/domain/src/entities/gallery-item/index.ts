import { defineEntity, withImages } from '@eleansphere/entity-core';
import type { FileDto } from '@eleansphere/entity-core';
import { FILE_REF_TYPES } from '../../constants';
import type { GalleryRow } from '../../constants';
import type { CategorySummary } from '../category';
import { galleryItemFields } from './fields';

export const GALLERY_PATH = '/api/gallery';
/** Row by row, then as the admin ordered them. */
export const GALLERY_ORDER = 'row,sortOrder,createdAt';

/**
 * The landing page's gallery. Anyone reads the active pictures; the admin reads all and writes.
 * Each item has one photo (`refType: 'GalleryItem'`, `role: 'image'`), attached as `images`.
 */
export const galleryItemEntity = defineEntity({
  name: 'GalleryItem',
  prefix: 'gal',
  basePath: GALLERY_PATH,
  access: { read: 'public', write: 'auth' },
  fields: galleryItemFields,
  query: {
    filter: { active: 'eq', row: 'eq', categoryId: 'eq' },
    sort: ['row', 'sortOrder', 'createdAt'],
    defaultSort: GALLERY_ORDER,
    defaultLimit: 200,
    maxLimit: 200,
  },
  extend: (Base) => class extends withImages(Base, FILE_REF_TYPES.galleryItem) {},
});

export type GalleryItem = InstanceType<typeof galleryItemEntity.Dto>;

/** A gallery picture as the API returns it. */
export type GalleryItemWithImages = Omit<GalleryItem, 'row'> & {
  row: GalleryRow;
  images: FileDto[];
  category: CategorySummary | null;
};
