<script setup lang="ts">
import { computed } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import type { PaginatedResponse } from '@eleansphere/entity-core';
import type { ProductWithImages } from '@klotilda/domain';
import PageHeader from '@/components/PageHeader.vue';
import RevenueChart from '@/components/RevenueChart.vue';
import StatTile from '@/components/StatTile.vue';
import { fileUrl, services } from '@/app/api';
import { fetchAllPages } from '@/app/all-pages';
import { formatCzk, formatDateTime, inMonth, plural } from '@/app/format';
import {
  daysSince,
  isPaymentOverdue,
  ORDER_STAGES,
  overdueCutoff,
  UNPAID_WARNING_DAYS,
} from '@/app/order-stages';
import { PRODUCT_STATUSES } from '@/app/product-statuses';
import { lastMonths, REVENUE_MONTHS, revenueByMonth } from '@/app/revenue';

/** How many orders each list on the overview shows. */
const LIST_LENGTH = 5;
/** How many sold-out products the overview shows; the rest are a click away. */
const SOLD_OUT_SHOWN = 12;
const NOT_LOADED = '–';

const stage = (value: string) => ORDER_STAGES.find((candidate) => candidate.value === value)!;
const AWAITING_PAYMENT = stage('awaiting-payment');
const TO_PREPARE = stage('to-prepare');
const productStatus = (value: string) =>
  PRODUCT_STATUSES.find((candidate) => candidate.value === value)!;
const FOR_SALE = productStatus('for-sale');
const SOLD_OUT = productStatus('sold-out');

// ── Orders waiting for the artist ───────────────────────────────────
/** Oldest first: what has waited longest comes up top. */
const useStageList = (filter: (typeof ORDER_STAGES)[number]['filter'], key: string) =>
  useQuery({
    queryKey: ['orders', 'overview', key],
    queryFn: () => services.orders.getAll({ filter, sort: 'createdAt', limit: LIST_LENGTH }),
  });

const awaitingPayment = useStageList(AWAITING_PAYMENT.filter, AWAITING_PAYMENT.value);
const toPrepare = useStageList(TO_PREPARE.filter, TO_PREPARE.value);

/** How many unpaid orders the lists flag as overdue (`isPaymentOverdue`). */
const overdue = useQuery({
  queryKey: ['orders', 'overview', 'overdue'],
  queryFn: () =>
    services.orders.getAll({
      filter: { ...AWAITING_PAYMENT.filter, createdAt: { lte: overdueCutoff().toISOString() } },
      limit: 1,
    }),
});

// ── Revenue ─────────────────────────────────────────────────────────
/** The chart's months, fixed when the page opens. */
const months = lastMonths(new Date(), REVENUE_MONTHS);

/** Every paid order placed within the chart's months, oldest first. */
const paidOrders = useQuery({
  queryKey: ['orders', 'overview', 'paid', months[0].toISOString()],
  queryFn: () =>
    fetchAllPages((page, limit) =>
      services.orders.getAll({
        filter: { paymentStatus: ['paid'], createdAt: { gte: months[0].toISOString() } },
        sort: 'createdAt',
        page,
        limit,
      })
    ),
});

const revenue = computed(() =>
  paidOrders.data.value ? revenueByMonth(paidOrders.data.value, months) : undefined
);
const thisMonth = computed(() => revenue.value?.[revenue.value.length - 1]);

// ── Products ────────────────────────────────────────────────────────
const forSale = useQuery({
  queryKey: ['products', 'overview', FOR_SALE.value],
  queryFn: () => services.products.getAll({ filter: FOR_SALE.filter, limit: 1 }),
});

/** Still shown in the shop, but nothing left to sell: hide them or add pieces. */
const soldOut = useQuery({
  queryKey: ['products', 'overview', SOLD_OUT.value],
  queryFn: () =>
    services.products.getAll({ filter: SOLD_OUT.filter, limit: SOLD_OUT_SHOWN }) as Promise<
      PaginatedResponse<ProductWithImages>
    >,
});

// ── Tiles ───────────────────────────────────────────────────────────
const FAILED_HINT = 'Nepodařilo se načíst';

const overdueHint = computed(() => {
  if (overdue.isError.value) return FAILED_HINT;
  const count = overdue.data.value?.total ?? 0;
  return count ? `${count} déle než ${UNPAID_WARNING_DAYS} dní` : undefined;
});

const stats = computed(() => [
  {
    label: 'Čeká na platbu',
    icon: 'i-lucide-hourglass',
    value: awaitingPayment.data.value?.total ?? NOT_LOADED,
    loading: awaitingPayment.isPending.value,
    hint: awaitingPayment.isError.value ? FAILED_HINT : overdueHint.value,
    alert: !awaitingPayment.isError.value && !overdue.isError.value && Boolean(overdueHint.value),
    to: { name: 'orders' },
  },
  {
    label: 'K odeslání',
    icon: 'i-lucide-package-open',
    value: toPrepare.data.value?.total ?? NOT_LOADED,
    loading: toPrepare.isPending.value,
    hint: toPrepare.isError.value ? FAILED_HINT : undefined,
    to: { name: 'orders', query: { stage: TO_PREPARE.value } },
  },
  {
    label: `Zaplaceno ${inMonth(months[months.length - 1])}`,
    icon: 'i-lucide-banknote',
    value: thisMonth.value ? formatCzk(thisMonth.value.revenue) : NOT_LOADED,
    loading: paidOrders.isPending.value,
    hint: paidOrders.isError.value
      ? FAILED_HINT
      : plural(thisMonth.value?.orders ?? 0, 'objednávka', 'objednávky', 'objednávek'),
  },
  {
    label: 'V nabídce',
    icon: 'i-lucide-store',
    value: forSale.data.value?.total ?? NOT_LOADED,
    loading: forSale.isPending.value,
    hint: forSale.isError.value ? FAILED_HINT : 'produktů skladem',
    to: { name: 'products', query: { status: FOR_SALE.value } },
  },
]);
</script>

<template>
  <PageHeader title="Přehled" />

  <div class="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
    <StatTile v-for="stat in stats" :key="stat.icon" v-bind="stat" />
  </div>

  <div class="grid gap-4 lg:grid-cols-2 lg:items-start">
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
      <p v-else-if="list.query.isError.value" class="px-4 py-6 text-center text-sm text-error">
        Objednávky se nepodařilo načíst.
      </p>
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
                {{ formatDateTime(order.createdAt) }} · {{ order.shippingName }}
              </p>
            </div>
            <UBadge
              v-if="isPaymentOverdue(order)"
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

  <USkeleton v-if="paidOrders.isPending.value" class="mt-4 h-64" />
  <UAlert
    v-else-if="paidOrders.isError.value"
    class="mt-4"
    title="Tržby se nepodařilo načíst."
    color="error"
    variant="soft"
  />
  <RevenueChart v-else-if="revenue" class="mt-4" :months="revenue" />

  <UCard v-if="soldOut.data.value?.data.length" class="mt-4" :ui="{ body: 'p-0 sm:p-0' }">
    <template #header>
      <div class="flex items-start justify-between gap-3">
        <div>
          <h2 class="font-semibold">Vyprodané, ale pořád v nabídce</h2>
          <p class="text-sm text-muted">
            Na webu mají štítek „Vyprodáno“. Skryjte je, nebo doplňte kusy.
          </p>
        </div>
        <UButton
          :to="{ name: 'products', query: { status: SOLD_OUT.value } }"
          :label="`Vše (${soldOut.data.value.total})`"
          trailing-icon="i-lucide-arrow-right"
          color="neutral"
          variant="ghost"
          size="sm"
          class="shrink-0"
        />
      </div>
    </template>
    <ul class="grid grid-cols-3 gap-3 p-4 sm:grid-cols-4 lg:grid-cols-6">
      <li v-for="product in soldOut.data.value.data" :key="product.id">
        <RouterLink :to="{ name: 'product', params: { id: product.id } }" class="group block">
          <div class="relative aspect-[3/4] overflow-hidden rounded-md bg-elevated">
            <img
              v-if="product.images[0]"
              :src="fileUrl(product.images[0])"
              alt=""
              class="h-full w-full object-cover opacity-70 transition group-hover:opacity-100"
            />
            <UIcon
              v-else
              name="i-lucide-image"
              class="absolute inset-0 m-auto size-6 text-dimmed"
            />
          </div>
          <p class="mt-1 truncate text-sm group-hover:underline">{{ product.name_cs }}</p>
        </RouterLink>
      </li>
    </ul>
  </UCard>
</template>
