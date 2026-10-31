<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from '@nuxt/ui/composables';
import type { TableColumn } from '@nuxt/ui';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { parseOrderItems } from '@klotilda/domain';
import type { Order, OrderAction } from '@klotilda/domain';
import OrderStatusBadges from '@/components/OrderStatusBadges.vue';
import PageHeader from '@/components/PageHeader.vue';
import { services } from '@/app/api';
import { actOnOrders, commonBulkActions } from '@/app/bulk-actions';
import type { BulkOutcome } from '@/app/bulk-actions';
import { describeError } from '@/app/errors';
import { refreshAfterOrderAction, shouldNotify } from '@/app/order-actions';
import { formatCzk, formatDateTime, plural } from '@/app/format';
import {
  NOTIFYING_ACTIONS,
  ORDER_ACTION_HINTS,
  ORDER_ACTION_ICONS,
  ORDER_ACTION_LABELS,
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

/**
 * The columns the API sorts by, newest first by default. The orders client types `sort` from the
 * order entity's own list, so a column the entity drops fails the typecheck here.
 */
const SORT_COLUMNS = ['createdAt', 'totalAmount'] as const;
type SortColumn = (typeof SORT_COLUMNS)[number];
const sorting = ref<{ id: SortColumn; desc: boolean }[]>([{ id: 'createdAt', desc: true }]);
const sortParam = computed(() => {
  const [first] = sorting.value;
  return first ? (`${first.desc ? '-' : ''}${first.id}` as const) : undefined;
});

watch([stage, search, sorting], () => {
  page.value = 1;
});

const { data, isPending, isError } = useQuery({
  queryKey: ['orders', { stage: () => stage.value.value, search, page, sort: sortParam }],
  queryFn: () =>
    services.orders.getAll({
      filter: stage.value.filter,
      q: search.value.trim() || undefined,
      sort: sortParam.value,
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

// ── The table (from a tablet up; phones keep the list) ──────────────
const columns: TableColumn<Order>[] = [
  { id: 'select', meta: { class: { th: 'w-10', td: 'w-10' } } },
  { id: 'customer', header: 'Zákazník' },
  {
    accessorKey: 'variableSymbol',
    header: 'VS',
    // Not every column fits a tablet or a laptop beside the sidebar: VS and shipping show from xl.
    meta: { class: { th: 'hidden xl:table-cell', td: 'hidden tabular-nums xl:table-cell' } },
  },
  { accessorKey: 'createdAt', header: 'Přijato', enableSorting: true },
  {
    accessorKey: 'shippingMethod',
    header: 'Doprava',
    meta: { class: { th: 'hidden xl:table-cell', td: 'hidden xl:table-cell' } },
  },
  { id: 'status', header: 'Stav' },
  {
    accessorKey: 'totalAmount',
    header: 'Celkem',
    enableSorting: true,
    meta: { class: { th: 'text-right', td: 'text-right font-medium tabular-nums' } },
  },
];

/** One column sorts at a time; a third click goes back to newest first. */
function toggleSort(id: SortColumn) {
  const [current] = sorting.value;
  if (current?.id !== id) sorting.value = [{ id, desc: id === 'createdAt' }];
  else if (current.desc === (id === 'createdAt')) sorting.value = [{ id, desc: !current.desc }];
  else sorting.value = [{ id: 'createdAt', desc: true }];
}
function sortIcon(id: SortColumn): string {
  const [current] = sorting.value;
  if (current?.id !== id) return 'i-lucide-arrow-up-down';
  return current.desc ? 'i-lucide-arrow-down-wide-narrow' : 'i-lucide-arrow-up-narrow-wide';
}

function openOrder(_event: Event, row: { original: Order }) {
  void router.push({ name: 'order', params: { id: row.original.id } });
}

// ── Several orders at once ──────────────────────────────────────────
/** Selected order ids, as the table keeps them. */
const selection = ref<Record<string, boolean>>({});
const selected = computed(() => orders.value.filter((order) => selection.value[order.id]));
const bulkActions = computed(() => commonBulkActions(selected.value));
/** A selection belongs to the page it was made on. */
watch([stage, search, page, sorting], () => {
  selection.value = {};
});

const toast = useToast();
const queryClient = useQueryClient();
const bulk = reactive({
  action: null as OrderAction | null,
  open: false,
  notify: true,
  message: '',
  /** The orders the dialog is about, taken when it opens: a refetch meanwhile changes nothing. */
  orders: [] as Order[],
});

/** Shipping several at once has no tracking numbers: those go from each order's own page. */
const BULK_SHIP_HINT =
  'Zákazníci dostanou e-mail, že je zásilka na cestě, bez čísla zásilky. Objednávku s číslem zásilky odešlete z jejího detailu.';

function openBulk(action: OrderAction) {
  Object.assign(bulk, {
    action,
    open: true,
    notify: true,
    message: '',
    orders: selected.value,
  });
}

const runBulk = useMutation({
  mutationFn: ({ action, orders }: { action: OrderAction; orders: Order[] }) => {
    const notify = shouldNotify(action, bulk.notify);
    const message = notify ? bulk.message.trim() || undefined : undefined;
    return actOnOrders(orders, (order) =>
      services.orders.act(order.id, action, { notify, message })
    );
  },
  onSuccess: (outcome) => {
    bulk.open = false;
    selection.value = {};
    refreshAfterOrderAction(queryClient);
    reportBulkOutcome(outcome);
  },
  onError: (err) => toast.add({ title: describeError(err), color: 'error' }),
});

function confirmBulk() {
  if (!bulk.action || runBulk.isPending.value) return;
  runBulk.mutate({ action: bulk.action, orders: bulk.orders });
}

function reportBulkOutcome({ done, failed, emailFailed }: BulkOutcome) {
  if (done) {
    toast.add({
      title: `Hotovo: ${plural(done, 'objednávka', 'objednávky', 'objednávek')}`,
      description: emailFailed
        ? `U ${emailFailed} se nepodařilo odeslat e-mail zákazníkovi.`
        : undefined,
      color: emailFailed ? 'warning' : 'success',
    });
  }
  if (failed.length) {
    toast.add({ title: 'Některé se nepovedly', description: failed.join('; '), color: 'error' });
  }
}
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
  <!-- Phones: one line per order. -->
  <ul
    v-else
    class="divide-y divide-default overflow-hidden rounded-lg bg-default ring ring-default md:hidden"
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
        <OrderStatusBadges :order="order" />
        <span class="w-24 text-right font-medium tabular-nums">
          {{ formatCzk(order.totalAmount) }}
        </span>
      </RouterLink>
    </li>
  </ul>

  <template v-if="!isError && !isPending && orders.length">
    <div
      v-if="selected.length"
      class="mb-3 hidden flex-wrap items-center gap-2 rounded-lg bg-elevated/60 px-3 py-2 ring ring-default md:flex"
    >
      <span class="mr-auto text-sm text-highlighted">
        Vybráno {{ plural(selected.length, 'objednávka', 'objednávky', 'objednávek') }}
      </span>
      <UButton
        v-for="action in bulkActions"
        :key="action"
        :icon="ORDER_ACTION_ICONS[action]"
        :label="ORDER_ACTION_LABELS[action]"
        size="sm"
        @click="openBulk(action)"
      />
      <span v-if="!bulkActions.length" class="text-sm text-muted">
        Vybrané objednávky nemají společnou akci.
      </span>
      <UButton
        label="Zrušit výběr"
        color="neutral"
        variant="ghost"
        size="sm"
        @click="selection = {}"
      />
    </div>

    <UTable
      v-model:row-selection="selection"
      :data="orders"
      :columns="columns"
      :get-row-id="(order: Order) => order.id"
      :sorting="sorting"
      :sorting-options="{ manualSorting: true }"
      class="hidden rounded-lg bg-default ring ring-default md:block"
      :ui="{ tr: 'cursor-pointer', td: 'py-2.5' }"
      @select="openOrder"
    >
      <template #select-header="{ table }">
        <UCheckbox
          :model-value="
            table.getIsSomePageRowsSelected() ? 'indeterminate' : table.getIsAllPageRowsSelected()
          "
          aria-label="Vybrat vše"
          @update:model-value="(value) => table.toggleAllPageRowsSelected(!!value)"
        />
      </template>
      <template #select-cell="{ row }">
        <!-- The whole cell selects: a click beside the box must not open the order. -->
        <div class="-m-4 flex p-4" @click.stop="row.toggleSelected()">
          <UCheckbox
            :model-value="row.getIsSelected()"
            :aria-label="`Vybrat objednávku ${row.original.variableSymbol}`"
            @click.stop
            @update:model-value="(value) => row.toggleSelected(!!value)"
          />
        </div>
      </template>
      <template v-for="id in SORT_COLUMNS" :key="id" #[`${id}-header`]="{ column }">
        <UButton
          :label="String(column.columnDef.header)"
          :trailing-icon="sortIcon(id)"
          color="neutral"
          variant="ghost"
          size="sm"
          class="-mx-2.5 text-sm font-semibold text-highlighted"
          :class="{ 'float-right': id === 'totalAmount' }"
          @click="toggleSort(id)"
        />
      </template>
      <template #customer-cell="{ row }">
        <p class="font-medium text-highlighted">
          {{ row.original.customerFirstName }} {{ row.original.customerLastName }}
        </p>
        <p class="max-w-64 truncate text-xs text-muted">{{ describeItems(row.original) }}</p>
      </template>
      <template #createdAt-cell="{ row }">
        <span class="whitespace-nowrap">{{ formatDateTime(row.original.createdAt) }}</span>
        <UBadge
          v-if="waitingTooLong(row.original)"
          :label="`čeká ${daysSince(row.original.createdAt)} dní`"
          icon="i-lucide-clock-alert"
          color="error"
          variant="subtle"
          size="sm"
          class="ml-2"
        />
      </template>
      <template #shippingMethod-cell="{ row }">
        {{ SHIPPING_LABELS[(row.original as Order).shippingMethod] }}
      </template>
      <template #status-cell="{ row }">
        <div class="flex flex-wrap gap-1">
          <OrderStatusBadges :order="row.original as Order" />
        </div>
      </template>
      <template #totalAmount-cell="{ row }">
        {{ formatCzk(row.original.totalAmount) }}
      </template>
    </UTable>
  </template>

  <div v-if="total > PAGE_SIZE" class="mt-4 flex justify-center">
    <UPagination v-model:page="page" :total="total" :items-per-page="PAGE_SIZE" />
  </div>
  <UModal
    v-if="bulk.action"
    v-model:open="bulk.open"
    :dismissible="!runBulk.isPending.value"
    :title="`${ORDER_ACTION_LABELS[bulk.action]}: ${plural(bulk.orders.length, 'objednávka', 'objednávky', 'objednávek')}`"
    :description="bulk.action === 'ship' ? BULK_SHIP_HINT : ORDER_ACTION_HINTS[bulk.action]"
  >
    <template #body>
      <form id="bulk-action" class="space-y-4" @submit.prevent="confirmBulk">
        <UFormField
          v-if="NOTIFYING_ACTIONS.includes(bulk.action) && bulk.notify"
          label="Zpráva pro zákazníky"
          help="Nepovinné. Stejná zpráva přijde do e-mailu všem vybraným."
        >
          <UTextarea v-model="bulk.message" :rows="3" autoresize class="w-full" />
        </UFormField>
        <UCheckbox
          v-if="NOTIFYING_ACTIONS.includes(bulk.action)"
          v-model="bulk.notify"
          label="Poslat zákazníkům e-mail"
        />
      </form>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton
          label="Zpět"
          color="neutral"
          variant="ghost"
          :disabled="runBulk.isPending.value"
          @click="bulk.open = false"
        />
        <UButton
          type="submit"
          form="bulk-action"
          :icon="ORDER_ACTION_ICONS[bulk.action]"
          :label="ORDER_ACTION_LABELS[bulk.action]"
          :loading="runBulk.isPending.value"
        />
      </div>
    </template>
  </UModal>
</template>
