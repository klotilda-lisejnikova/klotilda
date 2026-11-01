import { adminUserEntity } from './entities/admin-user';
import { categoryEntity } from './entities/category';
import { emailTemplateEntity } from './entities/email-template';
import { galleryItemEntity } from './entities/gallery-item';
import { legalDocumentVersionEntity } from './entities/legal-document';
import { orderEntity } from './entities/order';
import { paymentMethodEntity } from './entities/payment-method';
import { productEntity } from './entities/product';
import { sellerEntity } from './entities/seller';
import { shippingMethodEntity } from './entities/shipping-method';

export * from './codes';
export * from './constants';
export * from './legal-text';
export * from './ordering';
export * from './pickup-points';
export * from './placeholders';
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
  EMAIL_PLACEHOLDERS,
  EMAIL_TEMPLATE_KEYS,
  EMAIL_TEMPLATE_PREVIEW_ROUTE,
  EMAIL_TEMPLATES,
  EMAIL_TEMPLATES_PATH,
  emailTemplateEntity,
  isEmailTemplateKey,
  type EmailPlaceholder,
  type EmailPreview,
  type EmailPreviewRequest,
  type EmailTemplate,
  type EmailTemplateDefinition,
  type EmailTemplateKey,
  type EmailText,
} from './entities/email-template';
export { emailTemplateFields } from './entities/email-template/fields';
export {
  SELLER_PATH,
  sellerEntity,
  sellerLine,
  type Seller,
  type SellerDetails,
} from './entities/seller';
export { sellerFields } from './entities/seller/fields';
export * from './entities/legal-document';
export {
  LEGAL_VERSION_MAX_LENGTH,
  legalDocumentVersionFields,
} from './entities/legal-document/fields';
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
  TERMS_CHANGED,
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
  TRACKING_NUMBER_PLACEHOLDER,
  trackingUrlFor,
  type ShippingMethod,
} from './entities/shipping-method';
export { shippingMethodFields, TRACKING_URL_MAX_LENGTH } from './entities/shipping-method/fields';
export {
  PAYMENT_METHOD_ORDER,
  PAYMENT_METHODS_ORDER_ROUTE,
  PAYMENT_METHODS_PATH,
  paymentFitsShipping,
  paymentMethodEntity,
  type PaymentMethod,
} from './entities/payment-method';
export { paymentMethodFields } from './entities/payment-method/fields';
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
  paymentMethod: paymentMethodEntity,
  emailTemplate: emailTemplateEntity,
  seller: sellerEntity,
  legalDocumentVersion: legalDocumentVersionEntity,
};

/** Accounts are made by the seed script and signed in to through `/api/auth` only. */
export const ENTITIES_WITHOUT_CRUD_ROUTES = [adminUserEntity.config.name];
