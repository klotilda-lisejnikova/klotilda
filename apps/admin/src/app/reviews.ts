import { useQuery } from '@tanstack/vue-query';
import type { ReviewStatus } from '@klotilda/domain';
import { services } from './api';
import type { QueryTab } from './query-tabs';

/** Every query about reviews starts with this, so one invalidation refreshes them all. */
export const REVIEWS_QUERY_KEY = ['reviews'];
const PENDING: ReviewStatus = 'pending';

/** A tab of the reviews page: the reviews in one status. */
export interface ReviewTab extends QueryTab {
  value: ReviewStatus;
}

/** Waiting first: that is what the page is opened for. */
export const REVIEW_TABS: readonly ReviewTab[] = [
  { value: 'pending', label: 'Ke schválení' },
  { value: 'published', label: 'Zveřejněné' },
  { value: 'hidden', label: 'Skryté' },
];

/** How many reviews wait for the admin, for the sidebar's badge, the tab and the overview. */
export function usePendingReviewCount() {
  return useQuery({
    queryKey: [...REVIEWS_QUERY_KEY, 'pending-count'],
    queryFn: async () =>
      (await services.reviews.getAll({ filter: { status: [PENDING] }, limit: 1 })).total,
  });
}

/** The order's review, if it has one. */
export function useOrderReview(orderId: () => string) {
  return useQuery({
    queryKey: [...REVIEWS_QUERY_KEY, 'order', orderId],
    queryFn: async () =>
      (await services.reviews.getAll({ filter: { orderId: orderId() }, limit: 1 })).data[0] ?? null,
  });
}
