/**
 * What a shipping method does with a paid order: a carrier takes it (`delivery`, the order is
 * shipped) or the customer collects it (`pickup`, the order is made ready). The methods themselves
 * are rows the admin manages (`ShippingMethod`).
 */
export const SHIPPING_KINDS = ['delivery', 'pickup'] as const;
export type ShippingKind = (typeof SHIPPING_KINDS)[number];

/**
 * A carrier whose pickup point the customer chooses at checkout, on the carrier's own map: a
 * shipping method with one sends the parcel to that point, not to the customer's address.
 */
export const PICKUP_NETWORKS = ['packeta'] as const;
export type PickupNetwork = (typeof PICKUP_NETWORKS)[number];

/** A staffed pickup point, or a parcel box the customer opens with a code (Zásilkovna's Z-BOX). */
export const PICKUP_POINT_TYPES = ['point', 'box'] as const;
export type PickupPointType = (typeof PICKUP_POINT_TYPES)[number];

/**
 * How an order is paid, which decides what the shop and the admin do: a bank transfer before the
 * order goes out (variable symbol, QR code), or cash when the customer picks it up (only with a
 * `pickup` shipping method). The methods themselves are rows the admin manages (`PaymentMethod`).
 */
export const PAYMENT_KINDS = ['bank_transfer', 'cash'] as const;
export type PaymentKind = (typeof PAYMENT_KINDS)[number];

/** The admin records a payment once it reached the account, or the cash was handed over. */
export const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export const DEFAULT_PAYMENT_STATUS = 'pending' satisfies PaymentStatus;

/** `ready`: waiting to be picked up (a `pickup` shipping method), where others are `shipped`. */
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
