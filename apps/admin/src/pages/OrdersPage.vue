<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { keepPreviousData, useQuery } from '@tanstack/vue-query';
import type { OrderStatus, PaymentStatus } from '@klotilda/domain';
import PageHeader from '@/components/PageHeader.vue';
import { services } from '@/app/api';
import { formatCzk, formatDateTime } from '@/app/format';
import {
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
  PAYMENT_STATUS_LABELS,
  toSelectItems,
} from '@/app/labels';

const PAGE_SIZE = 25;
const ALL = 'all';

const paymentStatus = ref<PaymentStatus | typeof ALL>(ALL);
const orderStatus = ref<OrderStatus | typeof ALL>(ALL);
const search = ref('');
const page = ref(1);

const paymentItems = [
  { value: ALL, label: 'Všechny platby' },
  ...toSelectItems(PAYMENT_STATUS_LABELS),
];
const orderItems = [{ value: ALL, label: 'Všechny stavy' }, ...toSelectItems(ORDER_STATUS_LABELS)];

watch([paymentStatus, orderStatus, search], () => {
  page.value = 1;
});

const { data, isPending, isError } = useQuery({
  queryKey: ['orders', { paymentStatus, orderStatus, search, page }],
  queryFn: () =>
    services.orders.getAll({
      filter: {
        paymentStatus: paymentStatus.value === ALL ? undefined : paymentStatus.value,
        orderStatus: orderStatus.value === ALL ? undefined : orderStatus.value,
      },
      q: search.value.trim() || undefined,
      page: page.value,
      limit: PAGE_SIZE,
    }),
  placeholderData: keepPreviousData,
});

const orders = computed(() => data.value?.data ?? []);
const total = computed(() => data.value?.total ?? 0);
</script>

<template>
  <PageHeader title="Objednávky" />

  <div class="mb-4 flex flex-wrap gap-2">
    <UInput
      v-model="search"
      icon="i-lucide-search"
      placeholder="Příjmení, e-mail nebo VS"
      aria-label="Hledat"
      class="w-full sm:w-64"
    />
    <USelect v-model="paymentStatus" :items="paymentItems" aria-label="Platba" class="w-44" />
    <USelect v-model="orderStatus" :items="orderItems" aria-label="Stav" class="w-44" />
  </div>

  <UAlert v-if="isError" title="Objednávky se nepodařilo načíst." color="error" variant="soft" />
  <div v-else-if="isPending" class="space-y-2">
    <USkeleton v-for="line in 5" :key="line" class="h-16 w-full" />
  </div>
  <UCard v-else-if="orders.length === 0" class="text-center text-sm text-muted">
    Žádné objednávky.
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
          </p>
          <p class="text-xs text-muted">
            {{ formatDateTime(order.createdAt) }} · VS {{ order.variableSymbol }}
          </p>
        </div>
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
