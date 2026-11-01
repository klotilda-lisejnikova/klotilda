<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import type { CommandPaletteGroup, CommandPaletteItem } from '@nuxt/ui';
import type { PaginatedResponse } from '@eleansphere/entity-core';
import type { Order, ProductWithImages } from '@klotilda/domain';
import { fileUrl, services } from '@/app/api';
import { formatCzk, formatDateTime } from '@/app/format';
import { PAYMENT_STATUS_LABELS } from '@/app/labels';

const props = defineProps<{
  /** The sections, as the sidebar lists them. */
  pages: CommandPaletteItem[];
}>();

/** Fewer letters than this match half the shop; the pages list is enough until then. */
const MIN_TERM_LENGTH = 2;
const RESULTS_PER_GROUP = 5;
/** Wait for typing to settle before asking the API. */
const SEARCH_DELAY_MS = 250;

const open = ref(false);
const searchTerm = ref('');
const term = ref('');
let pendingTerm: ReturnType<typeof setTimeout> | undefined;
watch(searchTerm, (value) => {
  clearTimeout(pendingTerm);
  pendingTerm = setTimeout(() => {
    term.value = value.trim();
  }, SEARCH_DELAY_MS);
});
const searching = computed(() => term.value.length >= MIN_TERM_LENGTH);
/** The results belong to what is typed now, not to a term still waiting out the delay. */
const settled = computed(() => searchTerm.value.trim() === term.value);
/** A closed palette asks nothing, also when other code refreshes the orders or products. */
const fetching = computed(() => open.value && searching.value);

const orders = useQuery({
  queryKey: ['orders', 'search', term],
  queryFn: () => services.orders.getAll({ q: term.value, limit: RESULTS_PER_GROUP }),
  enabled: fetching,
});

const products = useQuery({
  queryKey: ['products', 'search', term],
  queryFn: () =>
    services.products.getAll({ q: term.value, limit: RESULTS_PER_GROUP }) as Promise<
      PaginatedResponse<ProductWithImages>
    >,
  enabled: fetching,
});

const ACTIONS: CommandPaletteItem[] = [
  { label: 'Nový produkt', icon: 'i-lucide-plus', to: { name: 'product-new' } },
  { label: 'Nová fotka do galerie', icon: 'i-lucide-image-plus', to: { name: 'gallery-new' } },
];

function toOrderItem(order: Order): CommandPaletteItem {
  return {
    label: `${order.customerFirstName} ${order.customerLastName}`,
    suffix: `VS ${order.variableSymbol}`,
    description: `${formatDateTime(order.createdAt)} · ${formatCzk(order.totalAmount)} · ${PAYMENT_STATUS_LABELS[order.paymentStatus]}`,
    icon: 'i-lucide-receipt',
    to: { name: 'order', params: { id: order.id } },
  };
}

function toProductItem(product: ProductWithImages): CommandPaletteItem {
  const [photo] = product.images;
  return {
    label: product.name_cs,
    suffix: formatCzk(product.price),
    description: product.active ? `${product.stockCount} ks skladem` : 'Skrytý',
    ...(photo ? { avatar: { src: fileUrl(photo), alt: '' } } : { icon: 'i-lucide-package' }),
    to: { name: 'product', params: { id: product.id } },
  };
}

/** A failed search says so, rather than looking like "nothing found". */
const SEARCH_FAILED: CommandPaletteItem = {
  label: 'Hledání se nepovedlo. Zkuste to znovu.',
  icon: 'i-lucide-triangle-alert',
  disabled: true,
};

/** The API already matched the term (the entity's search fields): the palette must not filter again. */
function resultGroup<T>(
  id: string,
  label: string,
  query: { isError: { value: boolean }; data: { value?: { data: T[] } } },
  toItem: (row: T) => CommandPaletteItem
): CommandPaletteGroup {
  const items = query.isError.value ? [SEARCH_FAILED] : (query.data.value?.data ?? []).map(toItem);
  return { id, label, ignoreFilter: true, items };
}

const groups = computed<CommandPaletteGroup[]>(() => [
  ...(searching.value && settled.value
    ? [
        resultGroup('orders', 'Objednávky', orders, toOrderItem),
        resultGroup('products', 'Produkty', products, toProductItem),
      ]
    : []),
  { id: 'pages', label: 'Stránky', items: props.pages },
  { id: 'actions', label: 'Akce', items: ACTIONS },
]);

/** Waiting out the delay counts as searching too, so "no match" never shows too early. */
const loading = computed(
  () =>
    searchTerm.value.trim().length >= MIN_TERM_LENGTH &&
    (!settled.value || orders.isFetching.value || products.isFetching.value)
);
</script>

<template>
  <!-- Ctrl+K / ⌘K anywhere, or a search button (the sidebar; the top bar below lg). -->
  <UDashboardSearch
    v-model:open="open"
    v-model:search-term="searchTerm"
    :groups="groups"
    :loading="loading"
    placeholder="Objednávka (příjmení, e-mail, VS), produkt nebo stránka…"
  >
    <template #empty>
      <p class="py-6 text-center text-sm text-muted">
        {{ loading ? 'Hledám…' : 'Nic nenalezeno.' }}
      </p>
    </template>
  </UDashboardSearch>
</template>
