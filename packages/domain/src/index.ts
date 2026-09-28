import { adminUserEntity } from './entities/admin-user';
import { categoryEntity } from './entities/category';
import { galleryItemEntity } from './entities/gallery-item';
import { orderEntity } from './entities/order';
import { productEntity } from './entities/product';

export * from './constants';
export { adminUserEntity, type AdminUser } from './entities/admin-user';
export { adminUserFields } from './entities/admin-user/fields';
export {
  CATEGORIES_PATH,
  categoryEntity,
  CATEGORY_ORDER,
  toSlug,
  type Category,
  type CategorySummary,
} from './entities/category';
export { categoryFields } from './entities/category/fields';
export {
  productEntity,
  PRODUCTS_PATH,
  type Product,
  type ProductWithImages,
} from './entities/product';
export { productFields } from './entities/product/fields';
export {
  galleryItemEntity,
  GALLERY_ORDER,
  GALLERY_PATH,
  type GalleryItem,
  type GalleryItemWithImages,
} from './entities/gallery-item';
export { galleryItemFields } from './entities/gallery-item/fields';
export {
  CHECKOUT_PATH,
  MAX_ITEM_QUANTITY,
  MAX_ORDER_LINES,
  orderEntity,
  ORDERS_PATH,
  parseOrderItems,
  type CheckoutItem,
  type CheckoutRequest,
  type CheckoutResponse,
  type Order,
  type OrderItem,
} from './entities/order';
export { customerFields, orderFields } from './entities/order/fields';
export { createServices, KlotildaAuthService, type Services } from './services';

/** Every entity, for the API's `toModelConfigs(allEntities)`. */
export const allEntities = {
  adminUser: adminUserEntity,
  category: categoryEntity,
  product: productEntity,
  galleryItem: galleryItemEntity,
  order: orderEntity,
};

/** Accounts are made by the seed script and signed in to through `/api/auth` only. */
export const ENTITIES_WITHOUT_CRUD_ROUTES = [adminUserEntity.config.name];
