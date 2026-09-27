import type { FileDto } from "@eleansphere/entity-core";
import type {
  GalleryItemWithImages,
  ProductWithImages,
} from "@klotilda/domain";

export type {
  CheckoutResponse,
  GalleryRow,
  OrderStatus,
  PaymentStatus,
  ProductCategory,
  ShippingMethod,
} from "@klotilda/domain";
export { PRODUCT_CATEGORIES, SHIPPING_PRICES } from "@klotilda/domain";

/** Read shape — includes the `images` array the API attaches from the file service. */
export type Product = ProductWithImages;
export type ProductImage = FileDto;

/** Read shape — includes the `images` array the API attaches from the file service. */
export type GalleryItem = GalleryItemWithImages;
