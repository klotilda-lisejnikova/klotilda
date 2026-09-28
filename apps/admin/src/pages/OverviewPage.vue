<script setup lang="ts">
import { computed } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import type { PaginatedResponse } from '@eleansphere/entity-core';
import type { Order, ProductWithImages } from '@klotilda/domain';
import PageHeader from '@/components/PageHeader.vue';
import { fileUrl, services } from '@/app/api';
import { formatCzk, formatDateTime, inMonth, plural } from '@/app/format';
import { daysSince, ORDER_STAGES, UNPAID_WARNING_DAYS } from '@/app/order-stages';
import { SHIPPING_LABELS } from '@/app/labels';

/** How many orders each list on the overview shows. */
const LIST_LENGTH = 5;
/** Enough for a month of a small shop's paid orders. */
const MONTH_ORDERS_LIMIT = 200;
const PRODUCTS_LIMIT = 200;

const stage = (value: string) => ORDER_STAGES.find((candidate) => candidate.value === value)!;
const AWAITING_PAYMENT = stage('awaiting-payment');
const TO_PREPARE = stage('to-prepare');

/** Oldest first: what has waited longest comes up top. */
const useStageList = (filter: (typeof ORDER_STAGES)[number]['filter'], key: string) =>
  useQuery({
    queryKey: ['orders', 'overview', key],
    queryFn: () => services.orders.getAll({ filter, sort: 'createdAt', limit: LIST_LENGTH }),
  });

const awaitingPayment = useStageList(AWAITING_PAYMENT.filter, AWAITING_PAYMENT.value);
const toPrepare = useStageList(TO_PREPARE.filter, TO_PREPARE.value);

const { data: paidOrders } = useQuery({
  queryKey: ['orders', 'overview', 'paid'],
  queryFn: () =>
    services.orders.getAll({
      filter: { paymentStatus: ['paid'] },
      sort: '-createdAt',
      limit: MONTH_ORDERS_LIMIT,
    }),
});

/** Paid orders placed this calendar month. */
const month = computed(() => {
  const now = new Date();
  const orders = (paidOrders.value?.data ?? []).filter((order) => {
    const placed = new Date(order.createdAt);
    return placed.getFullYear() === now.getFullYear() && placed.getMonth() === now.getMonth();
  });
  return {
    count: orders.length,
    revenue: orders.reduce((sum, order) => sum + order.totalAmount, 0),
    name: inMonth(now),
  };
});

const { data: products } = useQuery({
  queryKey: ['products', 'overview'],
  queryFn: () =>
    services.products.getAll({ limit: PRODUCTS_LIMIT }) as Promise<
      PaginatedResponse<ProductWithImages>
    >,
});
const onOffer = computed(
  () => (products.value?.data ?? []).filter((p) => p.active && p.stockCount > 0).length
);
/** Still shown in the shop, but nothing left to sell: hide it or add pieces. */
const soldOut = computed(() =>
  (products.value?.data ?? []).filter((p) => p.active && p.stockCount === 0)
);

const stats = computed(() => [
  {
    label: 'Čeká na platbu',
    value: awaitingPayment.data.value?.total ?? '–',
    icon: 'i-lucide-hourglass',
    to: { name: 'orders' },
  },
  {
    label: 'K odeslání',
    value: toPrepare.data.value?.total ?? '–',
    icon: 'i-lucide-package-open',
    to: { name: 'orders', query: { stage: TO_PREPARE.value } },
  },
  {
    label: `Zaplaceno ${month.value.name}`,
    value: paidOrders.value ? formatCzk(month.value.revenue) : '–',
    hint: paidOrders.value
      ? plural(month.value.count, 'objednávka', 'objednávky', 'objednávek')
      : undefined,
    icon: 'i-lucide-banknote',
  },
  {
    label: 'V nabídce',
    value: products.value ? onOffer.value : '–',
    hint: products.value ? 'produktů skladem' : undefined,
    icon: 'i-lucide-store',
    to: { name: 'products' },
  },
]);

const waitingTooLong = (order: Order) => daysSince(order.createdAt) >= UNPAID_WARNING_DAYS;
</script>

<template>
  <PageHeader title="Přehled" />

  <div class="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
    <component
      :is="stat.to ? 'RouterLink' : 'div'"
      v-for="stat in stats"
      :key="stat.label"
      :to="stat.to"
      class="rounded-lg bg-default p-4 ring ring-default transition"
      :class="{ 'hover:ring-primary': stat.to }"
    >
      <div class="flex items-center gap-2 text-sm text-muted">
        <UIcon :name="stat.icon" class="size-4 shrink-0" />
        <span class="truncate">{{ stat.label }}</span>
      </div>
      <p class="mt-2 text-2xl font-semibold text-highlighted tabular-nums">{{ stat.value }}</p>
      <p v-if="stat.hint" class="text-xs text-muted">{{ stat.hint }}</p>
    </component>
  </div>

  <div class="grid gap-4 lg:grid-cols-2">
    <UCard
      v-for="list in [
        { title: 'Čeká na platbu', query: awaitingPayment, stage: AWAITING_PAYMENT.value },
        { title: 'K odeslání', query: toPrepare, stage: TO_PREPARE.value },
      ]"
      :key="list.title"
      :ui="{ body: 'p-0 sm:p-0' }"
    >
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="font-semibold">{{ list.title }}</h2>
          <UButton
            :to="{ name: 'orders', query: { stage: list.stage } }"
            label="Vše"
            trailing-icon="i-lucide-arrow-right"
            color="neutral"
            variant="ghost"
            size="sm"
          />
        </div>
      </template>
      <USkeleton v-if="list.query.isPending.value" class="m-4 h-24" />
      <p
        v-else-if="!list.query.data.value?.data.length"
        class="px-4 py-6 text-center text-sm text-muted"
      >
        Nic tu nečeká.
      </p>
      <ul v-else class="divide-y divide-default">
        <li v-for="order in list.query.data.value.data" :key="order.id">
          <RouterLink
            :to="{ name: 'order', params: { id: order.id } }"
            class="flex items-center gap-3 px-4 py-3 hover:bg-elevated"
          >
            <div class="mr-auto min-w-0">
              <p class="truncate font-medium text-highlighted">
                {{ order.customerFirstName }} {{ order.customerLastName }}
              </p>
              <p class="text-xs text-muted">
                {{ formatDateTime(order.createdAt) }} · {{ SHIPPING_LABELS[order.shippingMethod] }}
              </p>
            </div>
            <UBadge
              v-if="list.stage === AWAITING_PAYMENT.value && waitingTooLong(order)"
              :label="`${daysSince(order.createdAt)} dní`"
              icon="i-lucide-clock-alert"
              color="error"
              variant="subtle"
            />
            <span class="font-medium tabular-nums">{{ formatCzk(order.totalAmount) }}</span>
          </RouterLink>
        </li>
      </ul>
    </UCard>
  </div>

  <UCard v-if="soldOut.length" class="mt-4" :ui="{ body: 'p-0 sm:p-0' }">
    <template #header>
      <h2 class="font-semibold">Vyprodané, ale pořád v nabídce</h2>
      <p class="text-sm text-muted">
        Na webu mají štítek „Vyprodáno“. Skryjte je, nebo doplňte kusy.
      </p>
    </template>
    <ul class="grid grid-cols-3 gap-3 p-4 sm:grid-cols-4 lg:grid-cols-6">
      <li v-for="product in soldOut" :key="product.id">
        <RouterLink :to="{ name: 'product', params: { id: product.id } }" class="group block">
          <div class="aspect-[3/4] overflow-hidden rounded-md bg-elevated">
            <img
              v-if="product.images[0]"
              :src="fileUrl(product.images[0])"
              alt=""
              class="h-full w-full object-cover opacity-70 transition group-hover:opacity-100"
            />
          </div>
          <p class="mt-1 truncate text-sm group-hover:underline">{{ product.name_cs }}</p>
        </RouterLink>
      </li>
    </ul>
  </UCard>
</template>
