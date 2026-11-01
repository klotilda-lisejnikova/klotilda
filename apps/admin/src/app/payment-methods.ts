import { computed } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import type { PaymentMethod } from '@klotilda/domain';
import { services } from './api';

export const PAYMENT_METHODS_QUERY_KEY = ['payment-methods'];
const LIST_LIMIT = 100;

/** Every payment method, hidden ones too, in the checkout's order. */
export function usePaymentMethods() {
  const query = useQuery({
    queryKey: PAYMENT_METHODS_QUERY_KEY,
    queryFn: async (): Promise<PaymentMethod[]> =>
      (await services.paymentMethods.getAll({ limit: LIST_LIMIT })).data,
  });
  const methods = computed(() => query.data.value ?? []);
  return { ...query, methods };
}
