import { createServices } from "@klotilda/domain";
import type {
  CheckoutRequest,
  CheckoutResponse,
  GalleryItemWithImages,
  ProductCategory,
  ProductWithImages,
} from "@klotilda/domain";
import type { PaginatedResponse } from "@eleansphere/entity-core";

export * from "./types";

/** The website never signs in: it reads the catalogue and places orders. */
const services = createServices(
  process.env.NEXT_PUBLIC_API_URL ?? "",
  () => null,
);

export interface ProductListParams {
  category?: ProductCategory;
  page?: number;
  limit?: number;
}

/** Products on offer, newest first, each with its photos. */
export function listProducts({
  category,
  page,
  limit,
}: ProductListParams): Promise<PaginatedResponse<ProductWithImages>> {
  return services.products.getAll({
    filter: category ? { category } : undefined,
    page,
    limit,
  }) as Promise<PaginatedResponse<ProductWithImages>>;
}

export function getProduct(id: string): Promise<ProductWithImages> {
  return services.products.getById(id) as Promise<ProductWithImages>;
}

/** The landing page's gallery, row by row, in the order the admin set. */
export function listGallery(): Promise<
  PaginatedResponse<GalleryItemWithImages>
> {
  return services.gallery.getAll() as Promise<
    PaginatedResponse<GalleryItemWithImages>
  >;
}

/** Places the order; the API charges its own prices and answers how to pay. */
export function checkout(request: CheckoutRequest): Promise<CheckoutResponse> {
  return services.orders.checkout(request);
}
