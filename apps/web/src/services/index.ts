import { createServices } from "@klotilda/domain";
import type {
  CheckoutRequest,
  CheckoutResponse,
  GalleryItemWithImages,
  ProductWithImages,
} from "@klotilda/domain";
import type { PaginatedResponse } from "@eleansphere/entity-core";

export * from "./types";

/** The website never signs in: it reads the catalogue and places orders. */
const services = createServices(
  process.env.NEXT_PUBLIC_API_URL ?? "",
  () => null,
);

/** The most rows the API returns per page. */
const PAGE_LIMIT = 200;

/** Every row of a list, page by page — the shop and the gallery are small enough to load whole. */
async function fetchAll<T>(
  getPage: (page: number) => Promise<PaginatedResponse<T>>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let page = 1; ; page++) {
    const { data, total } = await getPage(page);
    rows.push(...data);
    if (data.length === 0 || rows.length >= total) return rows;
  }
}

/** Everything on offer, each with its photos; the shop page filters by category itself. */
export function listAllProducts(): Promise<ProductWithImages[]> {
  return fetchAll(
    (page) =>
      services.products.getAll({ page, limit: PAGE_LIMIT }) as Promise<
        PaginatedResponse<ProductWithImages>
      >,
  );
}

export function getProduct(id: string): Promise<ProductWithImages> {
  return services.products.getById(id) as Promise<ProductWithImages>;
}

/** The landing page's gallery, row by row, in the order the admin set. */
export function listGallery(): Promise<GalleryItemWithImages[]> {
  return fetchAll(
    (page) =>
      services.gallery.getAll({ page, limit: PAGE_LIMIT }) as Promise<
        PaginatedResponse<GalleryItemWithImages>
      >,
  );
}

/** Places the order; the API charges its own prices and answers how to pay. */
export function checkout(request: CheckoutRequest): Promise<CheckoutResponse> {
  return services.orders.checkout(request);
}
