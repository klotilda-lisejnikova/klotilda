import { computed } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import type { Category } from '@klotilda/domain';
import { services } from './api';

export const CATEGORIES_QUERY_KEY = ['categories'];
const LIST_LIMIT = 200;

/** `USelect` can't hold `null`: this stands for "no category" in the forms. */
export const NO_CATEGORY = 'none';

/** Every category, in the shop's order, with `USelect` items for the product and gallery forms. */
export function useCategories() {
  const query = useQuery({
    queryKey: CATEGORIES_QUERY_KEY,
    queryFn: async (): Promise<Category[]> =>
      (await services.categories.getAll({ limit: LIST_LIMIT })).data,
  });
  const categories = computed(() => query.data.value ?? []);
  const selectItems = computed(() =>
    categories.value.map((category) => ({ value: category.id, label: category.name_cs }))
  );
  return { ...query, categories, selectItems };
}

/** A form's category choice as the API stores it, and back. */
export const toCategoryId = (choice: string) => (choice === NO_CATEGORY ? null : choice);
export const toCategoryChoice = (id: string | null | undefined) => id ?? NO_CATEGORY;
