import { adminUserEntity } from './entities/admin-user';
import { categoryEntity } from './entities/category';
import { galleryItemEntity } from './entities/gallery-item';
import { orderEntity } from './entities/order';
import { productEntity } from './entities/product';
import { shippingMethodEntity } from './entities/shipping-method';

export * from './constants';
export * from './ordering';
export * from './seller';
export { adminUserEntity, type AdminUser } from './entities/admin-user';
export { adminUserFields } from './entities/admin-user/fields';
export {
  CATEGORIES_ORDER_ROUTE,
  CATEGORIES_PATH,
  categoryEntity,
  CATEGORY_ORDER,
  toSlug,
  type Category,
  type CategorySummary,
} from './entities/category';
export { categoryFields } from './entities/category/fields';
export {
  PRODUCT_IMAGE_ORDER_ROUTE,
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
  GALLERY_ROW_ORDER_ROUTE,
  type GalleryItem,
  type GalleryItemWithImages,
} from './entities/gallery-item';
export { galleryItemFields } from './entities/gallery-item/fields';
export {
  applyAction,
  availableActions,
  CHECKOUT_PATH,
  MAX_ITEM_QUANTITY,
  MAX_ORDER_LINES,
  ORDER_ACTION_ROUTE,
  ORDER_ACTIONS,
  orderEntity,
  ORDERS_PATH,
  parseOrderHistory,
  parseOrderItems,
  type CheckoutItem,
  type CheckoutRequest,
  type CheckoutResponse,
  type EmailOutcome,
  type Order,
  type OrderAction,
  type OrderActionRequest,
  type OrderEvent,
  type OrderItem,
  type OrderState,
} from './entities/order';
export {
  SHIPPING_METHOD_ORDER,
  SHIPPING_METHODS_ORDER_ROUTE,
  SHIPPING_METHODS_PATH,
  shippingMethodEntity,
  toShippingCode,
  TRACKING_NUMBER_PLACEHOLDER,
  trackingUrlFor,
  type ShippingMethod,
} from './entities/shipping-method';
export {
  SHIPPING_CODE_MAX_LENGTH,
  shippingMethodFields,
  TRACKING_URL_MAX_LENGTH,
} from './entities/shipping-method/fields';
export { customerFields, orderActionFields, orderFields } from './entities/order/fields';
export { createServices, KlotildaAuthService, type Services } from './services';

/** Every entity, for the API's `toModelConfigs(allEntities)`. */
export const allEntities = {
  adminUser: adminUserEntity,
  category: categoryEntity,
  product: productEntity,
  galleryItem: galleryItemEntity,
  order: orderEntity,
  shippingMethod: shippingMethodEntity,
};

/** Accounts are made by the seed script and signed in to through `/api/auth` only. */
export const ENTITIES_WITHOUT_CRUD_ROUTES = [adminUserEntity.config.name];
