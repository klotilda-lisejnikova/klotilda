/** How an order travels, with what it costs in CZK. The server charges these, never the client. */
export const SHIPPING_PRICES = {
  zasilkovna: 99,
  ceska_posta: 129,
  osobni_odber: 0,
} as const;
export type ShippingMethod = keyof typeof SHIPPING_PRICES;
export const SHIPPING_METHODS = [
  'zasilkovna',
  'ceska_posta',
  'osobni_odber',
] as const satisfies readonly ShippingMethod[];

/** Payments arrive by bank transfer; the admin records what reached the account. */
export const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export const DEFAULT_PAYMENT_STATUS = 'pending' satisfies PaymentStatus;

export const ORDER_STATUSES = ['new', 'processing', 'shipped', 'delivered', 'cancelled'] as const;
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
