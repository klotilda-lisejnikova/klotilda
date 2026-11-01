import { createServices } from "@klotilda/domain";
import type {
  CheckoutRequest,
  CheckoutResponse,
  GalleryItemWithImages,
  LegalDocumentKey,
  LegalVersionSummary,
  PaymentMethod,
  ProductWithImages,
  PublicReviewsPage,
  PublicReviewsQuery,
  PublishedLegalVersion,
  ReviewInvitation,
  ReviewSubmission,
  Seller,
  ShippingMethod,
  SiteText,
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

/** The shipping methods the shop offers (the API answers only the active ones), in its order. */
export async function listShippingMethods(): Promise<ShippingMethod[]> {
  return (await services.shippingMethods.getAll({ limit: 100 })).data;
}

/** The payment methods the shop offers (the API answers only the active ones), in its order. */
export async function listPaymentMethods(): Promise<PaymentMethod[]> {
  return (await services.paymentMethods.getAll({ limit: 100 })).data;
}

/** Places the order; the API charges its own prices and answers how to pay. */
export function checkout(request: CheckoutRequest): Promise<CheckoutResponse> {
  return services.orders.checkout(request);
}

/** Who sells, as the admin entered it; `undefined` while the API has no row. */
export async function getSeller(): Promise<Seller | undefined> {
  return (await services.seller.getAll({ limit: 1 })).data[0];
}

/** A legal page's version in force, or the published one named. */
export function getLegalVersion(
  document: LegalDocumentKey,
  version?: string,
): Promise<PublishedLegalVersion> {
  return version
    ? services.legalDocuments.version(document, version)
    : services.legalDocuments.current(document);
}

/** Every published version of a legal page, newest first. */
export function listLegalVersions(
  document: LegalDocumentKey,
): Promise<LegalVersionSummary[]> {
  return services.legalDocuments.published(document);
}

/** The texts the admin words for the website (`SITE_TEXT_KEYS`), one row each. */
export async function listSiteTexts(): Promise<SiteText[]> {
  return (await services.siteTexts.getAll({ limit: 50 })).data;
}

/** The published reviews, newest first, with the shop's average stars. */
export function listPublicReviews(
  query: PublicReviewsQuery = {},
): Promise<PublicReviewsPage> {
  return services.reviews.listPublic(query);
}

/** What the link from the e-mail invites the customer to review. */
export function getReviewInvitation(token: string): Promise<ReviewInvitation> {
  return services.reviews.invitation(token);
}

/** Writes the customer's review; it shows once the artist publishes it. */
export function submitReview(
  request: ReviewSubmission,
): Promise<{ id: string }> {
  return services.reviews.submit(request);
}
