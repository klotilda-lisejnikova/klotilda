<script setup lang="ts">
import { computed, ref, shallowReactive, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from '@nuxt/ui/composables';
import type { TableColumn } from '@nuxt/ui';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import type { ProductWithImages } from '@klotilda/domain';
import type { PaginatedResponse } from '@eleansphere/entity-core';
import PageHeader from '@/components/PageHeader.vue';
import { fileUrl, services } from '@/app/api';
import { useCategories } from '@/app/categories';
import { describeError } from '@/app/errors';
import { formatCzk, formatDateTime } from '@/app/format';
import { PRODUCT_STATUSES } from '@/app/product-statuses';
import { useQueryTab } from '@/app/query-tabs';
import { useStoredChoice } from '@/app/stored-choice';
import { useTableSort } from '@/app/table-sort';

type ProductList = PaginatedResponse<ProductWithImages>;

const PAGE_SIZE = 24;
const ALL = 'all';
/** Only the list's pages: the switch's instant update rewrites these, nothing else cached. */
const LIST_KEY = ['products', 'list'];

const route = useRoute();
const router = useRouter();
const toast = useToast();
const queryClient = useQueryClient();

// ── What is listed ──────────────────────────────────────────────────
/** The category and the tab live in the address, so going back from a product returns to them. */
const { categories, isPending: categoriesPending, selectItems } = useCategories();
/** A category the address names; an empty or unknown one (deleted meanwhile) counts as all. */
const category = computed({
  get: () => {
    const named = route.query.category;
    if (typeof named !== 'string' || named === '') return ALL;
    const known = categoriesPending.value || categories.value.some((entry) => entry.id === named);
    return known ? named : ALL;
  },
  set: (value: string) =>
    void router.replace({ query: { ...route.query, category: value === ALL ? undefined : value } }),
});
const categoryId = computed(() => (category.value === ALL ? undefined : category.value));
const categoryItems = computed(() => [
  { value: ALL, label: 'Všechny kategorie' },
  ...selectItems.value,
]);

/** How many products each counted tab holds, within the chosen category. */
async function countByStatus(): Promise<Record<string, number>> {
  const counted = PRODUCT_STATUSES.filter((candidate) => candidate.counted);
  const totals = await Promise.all(
    counted.map(async (candidate) => {
      const filter = { ...candidate.filter, categoryId: categoryId.value };
      const { total: inStatus } = await services.products.getAll({ filter, limit: 1 });
      return [candidate.value, inStatus] as const;
    })
  );
  return Object.fromEntries(totals);
}

const { data: counts } = useQuery({
  queryKey: ['products', 'status-counts', { category }],
  queryFn: countByStatus,
});

/** The tab, in the address as `status`. */
const {
  current: status,
  select: selectStatus,
  items: tabs,
  selectItems: statusItems,
} = useQueryTab(PRODUCT_STATUSES, 'status', counts);

const search = ref('');
const page = ref(1);

/** The columns the API sorts by (the product entity's `sort` list), newest first by default. */
const SORT_COLUMNS = ['name_cs', 'price', 'createdAt'] as const;
const { sorting, sortParam, toggleSort, sortIcon } =
  useTableSort<(typeof SORT_COLUMNS)[number]>('createdAt');

watch([() => status.value.value, category, search, sorting], () => {
  page.value = 1;
});

const { data, isPending, isError, isPlaceholderData } = useQuery({
  queryKey: [
    ...LIST_KEY,
    { status: () => status.value.value, category, search, page, sort: sortParam },
  ],
  queryFn: () =>
    services.products.getAll({
      filter: { ...status.value.filter, categoryId: categoryId.value },
      q: search.value.trim() || undefined,
      sort: sortParam.value,
      page: page.value,
      limit: PAGE_SIZE,
    }) as Promise<ProductList>,
  placeholderData: keepPreviousData,
});

const products = computed(() => data.value?.data ?? []);
const total = computed(() => data.value?.total ?? 0);

/** A page that emptied (its last product switched out of the tab) gives way to the last one left. */
watch(total, (count) => {
  if (isPlaceholderData.value) return;
  const lastPage = Math.max(1, Math.ceil(count / PAGE_SIZE));
  if (page.value > lastPage) page.value = lastPage;
});

// ── Table or cards ──────────────────────────────────────────────────
/** From a tablet up the admin picks; phones always show the cards. */
const VIEWS = ['table', 'cards'] as const;
const view = useStoredChoice('klotilda-admin.products-view', VIEWS, 'table');

const RIGHT_ALIGNED = { th: 'text-right', td: 'text-right tabular-nums' };
const FROM_XL = { th: 'hidden xl:table-cell', td: 'hidden whitespace-nowrap xl:table-cell' };
const columns: TableColumn<ProductWithImages>[] = [
  { accessorKey: 'name_cs', header: 'Produkt', enableSorting: true },
  {
    id: 'category',
    header: 'Kategorie',
    meta: { class: { th: 'hidden lg:table-cell', td: 'hidden lg:table-cell' } },
  },
  { accessorKey: 'price', header: 'Cena', enableSorting: true, meta: { class: RIGHT_ALIGNED } },
  { accessorKey: 'stockCount', header: 'Skladem', meta: { class: RIGHT_ALIGNED } },
  { id: 'active', header: 'V nabídce', meta: { class: { th: 'w-28', td: 'relative w-28' } } },
  { accessorKey: 'createdAt', header: 'Přidáno', enableSorting: true, meta: { class: FROM_XL } },
];

function openProduct(_event: Event, row: { original: ProductWithImages }) {
  void router.push({ name: 'product', params: { id: row.original.id } });
}

// ── The "in the shop" switch ────────────────────────────────────────
/** Products whose switch is being saved: it waits, and the list reloads once all are saved. */
const switching = shallowReactive(new Set<string>());

/** Shows a product's switch in its new state at once, on every cached page of the list. */
async function showActive(id: string, active: boolean) {
  await queryClient.cancelQueries({ queryKey: LIST_KEY });
  queryClient.setQueriesData<ProductList>({ queryKey: LIST_KEY }, (list) =>
    list
      ? { ...list, data: list.data.map((row) => (row.id === id ? { ...row, active } : row)) }
      : list
  );
}

interface ActiveChange {
  product: ProductWithImages;
  active: boolean;
}

const setActive = useMutation({
  mutationFn: ({ product, active }: ActiveChange) =>
    services.products.update(product.id, { active }),
  onMutate: ({ product, active }: ActiveChange) => showActive(product.id, active),
  onSuccess: (_saved, { product, active }) =>
    toast.add({
      title: active ? 'Zobrazeno v obchodě' : 'Skryto z obchodu',
      description: product.name_cs,
      color: 'success',
    }),
  onError: (err, { product, active }) => {
    void showActive(product.id, !active);
    toast.add({ title: describeError(err), description: product.name_cs, color: 'error' });
  },
  onSettled: (_saved, _err, { product }) => {
    switching.delete(product.id);
    void queryClient.invalidateQueries({ queryKey: ['product', product.id] });
    if (switching.size === 0) void queryClient.invalidateQueries({ queryKey: ['products'] });
  },
});

/** A switch waits while it saves, and while the rows shown still belong to the previous view. */
const switchDisabled = (product: ProductWithImages) =>
  switching.has(product.id) || isPlaceholderData.value;

function toggleActive(product: ProductWithImages, active: boolean) {
  if (switchDisabled(product)) return;
  switching.add(product.id);
  setActive.mutate({ product, active });
}
</script>

<template>
  <PageHeader title="Produkty">
    <template #actions>
      <UButton :to="{ name: 'product-new' }" icon="i-lucide-plus" label="Nový produkt" />
    </template>
  </PageHeader>

  <div class="mb-4 flex flex-wrap items-center gap-3">
    <UTabs
      :model-value="status.value"
      :items="tabs"
      :content="false"
      variant="link"
      class="hidden sm:flex"
      @update:model-value="selectStatus"
    />
    <!-- Phones: the tab and the category side by side, the search under them. -->
    <div class="grid w-full grid-cols-2 gap-2 sm:ml-auto sm:flex sm:w-auto sm:items-center">
      <USelect
        :model-value="status.value"
        :items="statusItems"
        aria-label="Které produkty"
        class="w-full sm:hidden"
        @update:model-value="selectStatus"
      />
      <USelect
        v-model="category"
        :items="categoryItems"
        aria-label="Kategorie"
        class="w-full sm:w-44"
      />
      <UInput
        v-model="search"
        icon="i-lucide-search"
        placeholder="Hledat podle názvu"
        aria-label="Hledat"
        class="col-span-2 w-full sm:order-first sm:w-56"
      />
      <UFieldGroup class="hidden md:inline-flex" aria-label="Zobrazení">
        <UButton
          icon="i-lucide-table-2"
          color="neutral"
          :variant="view === 'table' ? 'subtle' : 'outline'"
          :aria-pressed="view === 'table'"
          aria-label="Tabulka"
          @click="view = 'table'"
        />
        <UButton
          icon="i-lucide-layout-grid"
          color="neutral"
          :variant="view === 'cards' ? 'subtle' : 'outline'"
          :aria-pressed="view === 'cards'"
          aria-label="Karty"
          @click="view = 'cards'"
        />
      </UFieldGroup>
    </div>
  </div>

  <UAlert v-if="isError" title="Produkty se nepodařilo načíst." color="error" variant="soft" />
  <div v-else-if="isPending" class="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
    <USkeleton v-for="card in 8" :key="card" class="aspect-[3/4]" />
  </div>
  <UCard v-else-if="products.length === 0" class="text-center text-sm text-muted">
    {{ search ? 'Nic nenalezeno.' : 'Tady teď nic není.' }}
  </UCard>
  <template v-else>
    <!-- Cards: always on phones, from a tablet up when picked. -->
    <ul
      class="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4"
      :class="{ 'md:hidden': view === 'table' }"
    >
      <li
        v-for="product in products"
        :key="product.id"
        class="flex flex-col overflow-hidden rounded-lg bg-default ring ring-default transition hover:ring-primary"
      >
        <RouterLink :to="{ name: 'product', params: { id: product.id } }" class="block">
          <div class="relative aspect-[3/4] bg-elevated">
            <img
              v-if="product.images[0]"
              :src="fileUrl(product.images[0])"
              alt=""
              class="h-full w-full object-cover"
              :class="{ 'opacity-50': !product.active }"
            />
            <UIcon
              v-else
              name="i-lucide-image"
              class="absolute inset-0 m-auto size-8 text-dimmed"
            />
            <div class="absolute top-2 left-2 flex flex-wrap gap-1">
              <UBadge v-if="!product.active" label="Skrytý" color="neutral" variant="solid" />
              <UBadge
                v-if="product.stockCount === 0"
                label="Vyprodáno"
                color="warning"
                variant="solid"
              />
            </div>
          </div>
          <div class="px-3 pt-3">
            <p class="truncate font-medium text-highlighted">{{ product.name_cs }}</p>
            <p class="flex justify-between gap-2 text-sm text-muted">
              <span class="truncate">{{ product.category?.name_cs ?? '—' }}</span>
              <span class="tabular-nums">{{ formatCzk(product.price) }}</span>
            </p>
          </div>
        </RouterLink>
        <div class="mt-auto flex items-center justify-between gap-2 px-3 pt-2 pb-3">
          <USwitch
            :model-value="product.active"
            :loading="switching.has(product.id)"
            :disabled="isPlaceholderData"
            label="V nabídce"
            size="sm"
            :ui="{ label: 'whitespace-nowrap' }"
            @update:model-value="(active) => toggleActive(product, active)"
          />
          <!-- None left: the badge on the photo says so. -->
          <span v-if="product.stockCount > 0" class="text-xs text-muted tabular-nums">
            {{ product.stockCount }} ks
          </span>
        </div>
      </li>
    </ul>

    <UTable
      v-if="view === 'table'"
      :data="products"
      :columns="columns"
      :sorting="sorting"
      :sorting-options="{ manualSorting: true }"
      class="hidden rounded-lg bg-default ring ring-default md:block"
      :ui="{ tr: 'cursor-pointer', td: 'py-2' }"
      @select="openProduct"
    >
      <template v-for="id in SORT_COLUMNS" :key="id" #[`${id}-header`]="{ column }">
        <UButton
          :label="String(column.columnDef.header)"
          :trailing-icon="sortIcon(id)"
          color="neutral"
          variant="ghost"
          size="sm"
          class="-mx-2.5 text-sm font-semibold text-highlighted"
          :class="{ 'float-right': id === 'price' }"
          @click="toggleSort(id)"
        />
      </template>
      <template #name_cs-cell="{ row }">
        <div class="flex items-center gap-3">
          <div class="relative size-10 shrink-0 overflow-hidden rounded-md bg-elevated">
            <img
              v-if="row.original.images[0]"
              :src="fileUrl(row.original.images[0])"
              alt=""
              class="size-full object-cover"
              :class="{ 'opacity-50': !row.original.active }"
            />
            <UIcon
              v-else
              name="i-lucide-image"
              class="absolute inset-0 m-auto size-4 text-dimmed"
            />
          </div>
          <div class="min-w-0">
            <p
              class="max-w-72 truncate font-medium"
              :class="row.original.active ? 'text-highlighted' : 'text-muted'"
            >
              {{ row.original.name_cs }}
            </p>
            <p v-if="row.original.name_en" class="max-w-72 truncate text-xs text-muted">
              {{ row.original.name_en }}
            </p>
          </div>
        </div>
      </template>
      <template #category-cell="{ row }">
        {{ row.original.category?.name_cs ?? '—' }}
      </template>
      <template #price-cell="{ row }">
        {{ formatCzk(row.original.price) }}
      </template>
      <template #stockCount-cell="{ row }">
        <UBadge
          v-if="row.original.stockCount === 0"
          label="Vyprodáno"
          :color="row.original.active ? 'warning' : 'neutral'"
          variant="subtle"
        />
        <template v-else>{{ row.original.stockCount }} ks</template>
      </template>
      <template #active-cell="{ row }">
        <!-- The switch's cell is not a way into the product: a click beside it changes nothing. -->
        <div class="absolute inset-0 flex items-center px-4" @click.stop>
          <USwitch
            :model-value="row.original.active"
            :loading="switching.has(row.original.id)"
            :disabled="isPlaceholderData"
            :aria-label="`V nabídce: ${row.original.name_cs}`"
            @update:model-value="(active) => toggleActive(row.original, active)"
          />
        </div>
      </template>
      <template #createdAt-cell="{ row }">
        {{ formatDateTime(row.original.createdAt) }}
      </template>
    </UTable>
  </template>

  <div v-if="total > PAGE_SIZE" class="mt-4 flex justify-center">
    <UPagination v-model:page="page" :total="total" :items-per-page="PAGE_SIZE" />
  </div>
</template>
