import { useQuery } from '@tanstack/vue-query';
import type { Seller } from '@klotilda/domain';
import { services } from './api';

export const SELLER_QUERY_KEY = ['seller'];

/** The seller's row; `null` while the database has none. */
export function useSeller() {
  return useQuery({
    queryKey: SELLER_QUERY_KEY,
    queryFn: async (): Promise<Seller | null> =>
      (await services.seller.getAll({ limit: 1 })).data[0] ?? null,
  });
}
