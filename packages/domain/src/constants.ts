/**
 * What a shipping method does with a paid order: a carrier takes it (`delivery`, the order is
 * shipped) or the customer collects it (`pickup`, the order is made ready). The methods themselves
 * are rows the admin manages (`ShippingMethod`).
 */
export const SHIPPING_KINDS = ['delivery', 'pickup'] as const;
export type ShippingKind = (typeof SHIPPING_KINDS)[number];

/** Payments arrive by bank transfer; the admin records what reached the account. */
export const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export const DEFAULT_PAYMENT_STATUS = 'pending' satisfies PaymentStatus;

/** `ready`: waiting to be picked up in Prague (`osobni_odber`), where others are `shipped`. */
export const ORDER_STATUSES = [
  'new',
  'processing',
  'ready',
  'shipped',
  'delivered',
  'cancelled',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export const DEFAULT_ORDER_STATUS = 'new' satisfies OrderStatus;

/** The landing page lays its gallery out in two fixed rows. */
export const GALLERY_ROWS = [1, 2] as const;
export type GalleryRow = (typeof GALLERY_ROWS)[number];

/** Uploaded photos belong to a product or a gallery picture, in the `image` role. */
export const FILE_REF_TYPES = { product: 'Product', galleryItem: 'GalleryItem' } as const;
export const IMAGE_ROLE = 'image';

/** Originals are one of a kind: a new product has one piece in stock. */
export const DEFAULT_STOCK_COUNT = 1;
export const TITLE_MAX_LENGTH = 255;
