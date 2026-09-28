<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { keepPreviousData, useQuery } from '@tanstack/vue-query';
import { parseOrderItems } from '@klotilda/domain';
import type { Order } from '@klotilda/domain';
import PageHeader from '@/components/PageHeader.vue';
import { services } from '@/app/api';
import { formatCzk, formatDateTime } from '@/app/format';
import {
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
  PAYMENT_STATUS_LABELS,
  SHIPPING_LABELS,
} from '@/app/labels';
import { daysSince, DEFAULT_STAGE, ORDER_STAGES, UNPAID_WARNING_DAYS } from '@/app/order-stages';

const PAGE_SIZE = 25;

const route = useRoute();
const router = useRouter();

/** The tab lives in the address, so going back from an order returns to it. */
const stage = computed({
  get: () =>
    ORDER_STAGES.find((candidate) => candidate.value === route.query.stage) ?? ORDER_STAGES[0],
  set: (value) =>
    void router.replace({
      query: { ...route.query, stage: value.value === DEFAULT_STAGE ? undefined : value.value },
    }),
});
const selectStage = (value: string | number) => {
  stage.value = ORDER_STAGES.find((candidate) => candidate.value === value) ?? ORDER_STAGES[0];
};
const search = ref('');
const page = ref(1);

watch([stage, search], () => {
  page.value = 1;
});

const { data, isPending, isError } = useQuery({
  queryKey: ['orders', { stage: () => stage.value.value, search, page }],
  queryFn: () =>
    services.orders.getAll({
      filter: stage.value.filter,
      q: search.value.trim() || undefined,
      page: page.value,
      limit: PAGE_SIZE,
    }),
  placeholderData: keepPreviousData,
});

/** How many orders wait in the tabs that ask for something to be done. */
const { data: counts } = useQuery({
  queryKey: ['orders', 'stage-counts'],
  queryFn: async () => {
    const counted = ORDER_STAGES.filter((candidate) => candidate.counted);
    const totals = await Promise.all(
      counted.map(async (candidate) => {
        const { total } = await services.orders.getAll({ filter: candidate.filter, limit: 1 });
        return [candidate.value, total] as const;
      })
    );
    return Object.fromEntries(totals) as Record<string, number>;
  },
});

const tabs = computed(() =>
  ORDER_STAGES.map((candidate) => ({
    label: candidate.label,
    value: candidate.value,
    badge: counts.value?.[candidate.value] || undefined,
  }))
);

const stageItems = computed(() =>
  tabs.value.map((tab) => ({
    value: tab.value,
    label: tab.badge ? `${tab.label} (${tab.badge})` : tab.label,
  }))
);

const orders = computed(() => data.value?.data ?? []);
const total = computed(() => data.value?.total ?? 0);

/** "Váza Mech a 2 další" */
function describeItems(order: Order): string {
  const items = parseOrderItems(order);
  if (items.length === 0) return '';
  const [first, ...rest] = items;
  return rest.length ? `${first.name} a ${rest.length} další` : first.name;
}

const waitingTooLong = (order: Order) =>
  order.paymentStatus === 'pending' &&
  order.orderStatus !== 'cancelled' &&
  daysSince(order.createdAt) >= UNPAID_WARNING_DAYS;
</script>

<template>
  <PageHeader title="Objednávky" />

  <div class="mb-4 flex flex-wrap items-center gap-3">
    <UTabs
      :model-value="stage.value"
      :items="tabs"
      :content="false"
      variant="link"
      class="hidden sm:flex"
      @update:model-value="selectStage"
    />
    <!-- Six tabs don't fit a phone: a list there. -->
    <USelect
      :model-value="stage.value"
      :items="stageItems"
      aria-label="Které objednávky"
      class="w-full sm:hidden"
      @update:model-value="selectStage"
    />
    <UInput
      v-model="search"
      icon="i-lucide-search"
      placeholder="Příjmení, e-mail nebo VS"
      aria-label="Hledat"
      class="w-full sm:ml-auto sm:w-64"
    />
  </div>

  <UAlert v-if="isError" title="Objednávky se nepodařilo načíst." color="error" variant="soft" />
  <div v-else-if="isPending" class="space-y-2">
    <USkeleton v-for="line in 5" :key="line" class="h-16 w-full" />
  </div>
  <UCard v-else-if="orders.length === 0" class="text-center text-sm text-muted">
    {{ search ? 'Nic nenalezeno.' : 'Tady teď nic není.' }}
  </UCard>
  <ul
    v-else
    class="divide-y divide-default overflow-hidden rounded-lg bg-default ring ring-default"
  >
    <li v-for="order in orders" :key="order.id">
      <RouterLink
        :to="{ name: 'order', params: { id: order.id } }"
        class="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-elevated"
      >
        <div class="mr-auto min-w-0">
          <p class="truncate font-medium text-highlighted">
            {{ order.customerFirstName }} {{ order.customerLastName }}
            <span class="ml-1 font-normal text-muted">· {{ describeItems(order) }}</span>
          </p>
          <p class="text-xs text-muted">
            {{ formatDateTime(order.createdAt) }} · VS {{ order.variableSymbol }} ·
            {{ SHIPPING_LABELS[order.shippingMethod] }}
          </p>
        </div>
        <UBadge
          v-if="waitingTooLong(order)"
          :label="`čeká ${daysSince(order.createdAt)} dní`"
          icon="i-lucide-clock-alert"
          color="error"
          variant="subtle"
        />
        <UBadge
          :label="PAYMENT_STATUS_LABELS[order.paymentStatus]"
          :color="PAYMENT_STATUS_COLORS[order.paymentStatus]"
          variant="subtle"
        />
        <UBadge
          :label="ORDER_STATUS_LABELS[order.orderStatus]"
          :color="ORDER_STATUS_COLORS[order.orderStatus]"
          variant="subtle"
        />
        <span class="w-24 text-right font-medium tabular-nums">
          {{ formatCzk(order.totalAmount) }}
        </span>
      </RouterLink>
    </li>
  </ul>

  <div v-if="total > PAGE_SIZE" class="mt-4 flex justify-center">
    <UPagination v-model:page="page" :total="total" :items-per-page="PAGE_SIZE" />
  </div>
</template>
