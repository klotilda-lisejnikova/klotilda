import { computed } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import type { ShippingMethod } from '@klotilda/domain';
import { services } from './api';

export const SHIPPING_METHODS_QUERY_KEY = ['shipping-methods'];
const LIST_LIMIT = 100;

/** Every shipping method, hidden ones too, in the checkout's order. */
export function useShippingMethods() {
  const query = useQuery({
    queryKey: SHIPPING_METHODS_QUERY_KEY,
    queryFn: async (): Promise<ShippingMethod[]> =>
      (await services.shippingMethods.getAll({ limit: LIST_LIMIT })).data,
  });
  const methods = computed(() => query.data.value ?? []);
  return { ...query, methods };
}
