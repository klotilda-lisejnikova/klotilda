import { ApiError } from "@eleansphere/entity-core";
import type { PublicReviewsPage, PublicReviewsQuery } from "@klotilda/domain";
import { listPublicReviews } from "@/services";
import { loadStaticData } from "./static-data";

const NO_REVIEWS: PublicReviewsPage = {
  data: [],
  total: 0,
  page: 1,
  limit: 0,
  averageRating: null,
};

/**
 * The published reviews; none while the API has no reviews route yet (a web deployed before its
 * API), so the page renders without them and the next render asks again. Any other failure is
 * rethrown, so the cache keeps the last good page.
 */
async function reviewsOrNone(
  query: PublicReviewsQuery,
): Promise<PublicReviewsPage> {
  try {
    return await listPublicReviews(query);
  } catch (err) {
    if (err instanceof ApiError && err.isNotFound) return NO_REVIEWS;
    throw err;
  }
}

/** The published reviews for a page whose content they are (`/recenze`); none without an API. */
export function loadReviews(
  what: string,
  query: PublicReviewsQuery,
): Promise<PublicReviewsPage> {
  return loadStaticData(what, () => reviewsOrNone(query), NO_REVIEWS);
}

/**
 * The published reviews for a page they only add to (the home page, a product): a failure is
 * logged and the page renders without them rather than failing.
 */
export async function loadOptionalReviews(
  what: string,
  query: PublicReviewsQuery,
): Promise<PublicReviewsPage> {
  try {
    return await loadReviews(what, query);
  } catch (err) {
    console.error(`[${what}] The reviews could not be loaded.`, err);
    return NO_REVIEWS;
  }
}
