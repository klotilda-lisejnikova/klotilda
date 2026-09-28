import type { FileDto } from "@eleansphere/entity-core";
import type {
  GalleryItemWithImages,
  ProductWithImages,
} from "@klotilda/domain";

export type {
  CategorySummary,
  CheckoutResponse,
  GalleryRow,
  OrderStatus,
  PaymentStatus,
  ShippingMethod,
} from "@klotilda/domain";
export { SHIPPING_PRICES } from "@klotilda/domain";

/** Read shape — includes the `images` and `category` the API attaches. */
export type Product = ProductWithImages;
export type ProductImage = FileDto;

/** Read shape — includes the `images` and `category` the API attaches. */
export type GalleryItem = GalleryItemWithImages;
