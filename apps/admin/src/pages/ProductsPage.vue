<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { keepPreviousData, useQuery } from '@tanstack/vue-query';
import type { ProductCategory, ProductWithImages } from '@klotilda/domain';
import type { PaginatedResponse } from '@eleansphere/entity-core';
import PageHeader from '@/components/PageHeader.vue';
import { fileUrl, services } from '@/app/api';
import { formatCzk } from '@/app/format';
import { CATEGORY_LABELS, toSelectItems } from '@/app/labels';

const PAGE_SIZE = 24;
const ALL = 'all';

const category = ref<ProductCategory | typeof ALL>(ALL);
const search = ref('');
const page = ref(1);
const categoryItems = [
  { value: ALL, label: 'Všechny kategorie' },
  ...toSelectItems(CATEGORY_LABELS),
];

watch([category, search], () => {
  page.value = 1;
});

const { data, isPending, isError } = useQuery({
  queryKey: ['products', { category, search, page }],
  queryFn: () =>
    services.products.getAll({
      filter: { category: category.value === ALL ? undefined : category.value },
      q: search.value.trim() || undefined,
      page: page.value,
      limit: PAGE_SIZE,
    }) as Promise<PaginatedResponse<ProductWithImages>>,
  placeholderData: keepPreviousData,
});

const products = computed(() => data.value?.data ?? []);
const total = computed(() => data.value?.total ?? 0);
</script>

<template>
  <PageHeader title="Produkty">
    <template #actions>
      <UButton :to="{ name: 'product-new' }" icon="i-lucide-plus" label="Nový produkt" />
    </template>
  </PageHeader>

  <div class="mb-4 flex flex-wrap gap-2">
    <UInput
      v-model="search"
      icon="i-lucide-search"
      placeholder="Hledat podle názvu"
      aria-label="Hledat"
      class="w-full sm:w-64"
    />
    <USelect v-model="category" :items="categoryItems" aria-label="Kategorie" class="w-48" />
  </div>

  <UAlert v-if="isError" title="Produkty se nepodařilo načíst." color="error" variant="soft" />
  <div v-else-if="isPending" class="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
    <USkeleton v-for="card in 8" :key="card" class="aspect-[3/4]" />
  </div>
  <UCard v-else-if="products.length === 0" class="text-center text-sm text-muted">
    Žádné produkty.
  </UCard>
  <ul v-else class="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
    <li v-for="product in products" :key="product.id">
      <RouterLink
        :to="{ name: 'product', params: { id: product.id } }"
        class="block overflow-hidden rounded-lg bg-default ring ring-default transition hover:ring-primary"
      >
        <div class="relative aspect-[3/4] bg-elevated">
          <img
            v-if="product.images[0]"
            :src="fileUrl(product.images[0])"
            alt=""
            class="h-full w-full object-cover"
            :class="{ 'opacity-50': !product.active }"
          />
          <UIcon v-else name="i-lucide-image" class="absolute inset-0 m-auto size-8 text-dimmed" />
          <UBadge
            v-if="!product.active"
            label="Skrytý"
            color="neutral"
            variant="solid"
            class="absolute top-2 left-2"
          />
          <UBadge
            v-else-if="product.stockCount === 0"
            label="Vyprodáno"
            color="warning"
            variant="solid"
            class="absolute top-2 left-2"
          />
        </div>
        <div class="p-3">
          <p class="truncate font-medium text-highlighted">{{ product.name_cs }}</p>
          <p class="flex justify-between text-sm text-muted">
            <span>{{ product.category ? CATEGORY_LABELS[product.category] : '—' }}</span>
            <span class="tabular-nums">{{ formatCzk(product.price) }}</span>
          </p>
        </div>
      </RouterLink>
    </li>
  </ul>

  <div v-if="total > PAGE_SIZE" class="mt-4 flex justify-center">
    <UPagination v-model:page="page" :total="total" :items-per-page="PAGE_SIZE" />
  </div>
</template>
