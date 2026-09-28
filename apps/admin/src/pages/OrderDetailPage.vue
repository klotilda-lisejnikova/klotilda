<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useToast } from '@nuxt/ui/composables';
import { useRouter } from 'vue-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import {
  availableActions,
  parseOrderHistory,
  parseOrderItems,
  TRACKING_URLS,
} from '@klotilda/domain';
import type { Order, OrderAction, OrderStatus, PaymentStatus } from '@klotilda/domain';
import ConfirmDelete from '@/components/ConfirmDelete.vue';
import PageHeader from '@/components/PageHeader.vue';
import { services } from '@/app/api';
import { describeError } from '@/app/errors';
import { formatCzk, formatDateTime } from '@/app/format';
import {
  EMAIL_OUTCOME_LABELS,
  NOTIFYING_ACTIONS,
  ORDER_ACTION_HINTS,
  ORDER_ACTION_ICONS,
  ORDER_ACTION_LABELS,
  ORDER_EVENT_LABELS,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
  PAYMENT_STATUS_LABELS,
  SHIPPING_LABELS,
  toSelectItems,
} from '@/app/labels';

const props = defineProps<{ id: string }>();

/** Actions that close something off get the quieter look; the rest move the order forward. */
const SECONDARY_ACTIONS: readonly OrderAction[] = ['cancel'];

const toast = useToast();
const router = useRouter();
const queryClient = useQueryClient();

const {
  data: order,
  isPending,
  isError,
} = useQuery({
  queryKey: ['order', () => props.id],
  queryFn: () => services.orders.getById(props.id),
});

const items = computed(() => (order.value ? parseOrderItems(order.value) : []));
const history = computed(() => (order.value ? parseOrderHistory(order.value).reverse() : []));
const actions = computed(() => (order.value ? availableActions(order.value) : []));
const forwardActions = computed(() =>
  actions.value.filter((action) => !SECONDARY_ACTIONS.includes(action))
);
const trackingUrl = computed(() =>
  order.value?.trackingNumber
    ? TRACKING_URLS[order.value.shippingMethod]?.(order.value.trackingNumber)
    : undefined
);
const address = computed(() =>
  order.value
    ? `${order.value.customerFirstName} ${order.value.customerLastName}\n${order.value.street}\n${order.value.zip} ${order.value.city}`
    : ''
);

function saved(updated: Order, title: string) {
  queryClient.setQueryData(['order', props.id], updated);
  void queryClient.invalidateQueries({ queryKey: ['orders'] });
  void queryClient.invalidateQueries({ queryKey: ['products'] });
  toast.add({ title, color: 'success' });
}

// ── An action, confirmed in a dialog ────────────────────────────────
const pending = ref<OrderAction | null>(null);
const dialogOpen = ref(false);
const details = reactive({ notify: true, message: '', trackingNumber: '', restock: true });

function openAction(action: OrderAction) {
  pending.value = action;
  Object.assign(details, { notify: true, message: '', trackingNumber: '', restock: true });
  dialogOpen.value = true;
}

const act = useMutation({
  mutationFn: (action: OrderAction) =>
    services.orders.act(props.id, action, {
      notify: NOTIFYING_ACTIONS.includes(action) ? details.notify : false,
      message: details.message.trim() || undefined,
      trackingNumber: action === 'ship' ? details.trackingNumber.trim() || undefined : undefined,
      restock: action === 'cancel' ? details.restock : undefined,
    }),
  onSuccess: (updated, action) => {
    dialogOpen.value = false;
    const last = parseOrderHistory(updated).at(-1);
    if (last?.email === 'failed') {
      queryClient.setQueryData(['order', props.id], updated);
      toast.add({
        title: 'Uloženo, ale e-mail zákazníkovi se nepodařilo odeslat.',
        color: 'warning',
      });
      return;
    }
    saved(updated, ORDER_EVENT_LABELS[action]);
  },
  onError: (err) => toast.add({ title: describeError(err), color: 'error' }),
});

// ── Corrections by hand: the statuses only, no e-mail, no stock ─────
const orderStatusItems = toSelectItems(ORDER_STATUS_LABELS);
const paymentStatusItems = toSelectItems(PAYMENT_STATUS_LABELS);
const update = useMutation({
  mutationFn: (changes: { orderStatus?: OrderStatus; paymentStatus?: PaymentStatus }) =>
    services.orders.update(props.id, changes),
  onSuccess: (updated: Order) => saved(updated, 'Uloženo'),
  onError: (err) => toast.add({ title: describeError(err), color: 'error' }),
});

const remove = useMutation({
  mutationFn: () => services.orders.delete(props.id),
  onSuccess: async () => {
    void queryClient.invalidateQueries({ queryKey: ['orders'] });
    toast.add({ title: 'Objednávka smazána', color: 'success' });
    await router.push({ name: 'orders' });
  },
  onError: (err) => toast.add({ title: describeError(err), color: 'error' }),
});

async function copy(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.add({ title: `${what} zkopírováno`, color: 'success' });
  } catch {
    toast.add({ title: 'Kopírování se nepovedlo', color: 'error' });
  }
}
</script>

<template>
  <PageHeader
    :title="order ? `Objednávka ${order.variableSymbol}` : 'Objednávka'"
    :back="{ name: 'orders' }"
  >
    <template v-if="order" #actions>
      <UBadge
        :label="PAYMENT_STATUS_LABELS[order.paymentStatus]"
        :color="PAYMENT_STATUS_COLORS[order.paymentStatus]"
        variant="subtle"
        size="lg"
      />
      <UBadge
        :label="ORDER_STATUS_LABELS[order.orderStatus]"
        :color="ORDER_STATUS_COLORS[order.orderStatus]"
        variant="subtle"
        size="lg"
      />
    </template>
  </PageHeader>

  <UAlert v-if="isError" title="Objednávku se nepodařilo načíst." color="error" variant="soft" />
  <USkeleton v-else-if="isPending" class="h-64 w-full" />
  <div v-else-if="order" class="grid gap-4 lg:grid-cols-3">
    <div class="space-y-4 lg:col-span-2">
      <!-- What to do next -->
      <UCard v-if="actions.length" :ui="{ body: 'flex flex-wrap items-center gap-2' }">
        <UButton
          v-for="action in forwardActions"
          :key="action"
          :icon="ORDER_ACTION_ICONS[action]"
          :label="ORDER_ACTION_LABELS[action]"
          :color="action === forwardActions[0] ? 'primary' : 'neutral'"
          :variant="action === forwardActions[0] ? 'solid' : 'soft'"
          size="lg"
          @click="openAction(action)"
        />
        <UButton
          v-if="actions.includes('cancel')"
          :icon="ORDER_ACTION_ICONS.cancel"
          :label="ORDER_ACTION_LABELS.cancel"
          color="error"
          variant="ghost"
          class="ml-auto"
          @click="openAction('cancel')"
        />
      </UCard>

      <UCard>
        <template #header><h2 class="font-semibold">Položky</h2></template>
        <ul class="divide-y divide-default">
          <li v-for="item in items" :key="item.productId" class="flex gap-3 py-2">
            <RouterLink
              :to="{ name: 'product', params: { id: item.productId } }"
              class="mr-auto hover:underline"
            >
              {{ item.name }}
            </RouterLink>
            <span class="text-muted">{{ item.quantity }}×</span>
            <span class="w-24 text-right tabular-nums">{{
              formatCzk(item.price * item.quantity)
            }}</span>
          </li>
          <li class="flex gap-3 py-2 text-muted">
            <span class="mr-auto">Doprava — {{ SHIPPING_LABELS[order.shippingMethod] }}</span>
            <span class="w-24 text-right tabular-nums">{{ formatCzk(order.shippingPrice) }}</span>
          </li>
          <li class="flex gap-3 pt-2 font-semibold">
            <span class="mr-auto">Celkem</span>
            <span class="w-24 text-right tabular-nums">{{ formatCzk(order.totalAmount) }}</span>
          </li>
        </ul>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex items-center justify-between gap-2">
            <h2 class="font-semibold">Zákazník</h2>
            <UButton
              icon="i-lucide-copy"
              label="Kopírovat adresu"
              color="neutral"
              variant="ghost"
              size="sm"
              @click="copy(address, 'Adresa')"
            />
          </div>
        </template>
        <dl class="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
          <dt class="text-muted">Jméno</dt>
          <dd>{{ order.customerFirstName }} {{ order.customerLastName }}</dd>
          <dt class="text-muted">E-mail</dt>
          <dd>
            <a :href="`mailto:${order.customerEmail}`" class="text-primary hover:underline">
              {{ order.customerEmail }}
            </a>
          </dd>
          <template v-if="order.customerPhone">
            <dt class="text-muted">Telefon</dt>
            <dd>{{ order.customerPhone }}</dd>
          </template>
          <dt class="text-muted">Adresa</dt>
          <dd>{{ order.street }}, {{ order.zip }} {{ order.city }}</dd>
          <template v-if="order.trackingNumber">
            <dt class="text-muted">Číslo zásilky</dt>
            <dd>
              <a
                v-if="trackingUrl"
                :href="trackingUrl"
                target="_blank"
                rel="noopener"
                class="text-primary hover:underline"
                >{{ order.trackingNumber }}</a
              >
              <span v-else>{{ order.trackingNumber }}</span>
            </dd>
          </template>
          <template v-if="order.notes">
            <dt class="text-muted">Poznámka</dt>
            <dd class="whitespace-pre-line">{{ order.notes }}</dd>
          </template>
          <dt class="text-muted">Přijato</dt>
          <dd>{{ formatDateTime(order.createdAt) }}</dd>
          <template v-if="order.termsVersion">
            <dt class="text-muted">Obchodní podmínky</dt>
            <dd>
              verze {{ order.termsVersion }}
              <span v-if="order.termsAcceptedAt" class="text-muted">
                · souhlas {{ formatDateTime(order.termsAcceptedAt) }}
              </span>
            </dd>
          </template>
        </dl>
      </UCard>
    </div>

    <div class="space-y-4">
      <UCard>
        <template #header><h2 class="font-semibold">Platba</h2></template>
        <dl class="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-2 text-sm">
          <dt class="text-muted">Variabilní symbol</dt>
          <dd class="font-medium text-highlighted tabular-nums">{{ order.variableSymbol }}</dd>
          <UButton
            icon="i-lucide-copy"
            color="neutral"
            variant="ghost"
            size="xs"
            aria-label="Kopírovat variabilní symbol"
            @click="copy(order.variableSymbol, 'Variabilní symbol')"
          />
          <dt class="text-muted">Částka</dt>
          <dd class="font-medium text-highlighted tabular-nums">
            {{ formatCzk(order.totalAmount) }}
          </dd>
          <span />
        </dl>
      </UCard>

      <UCard>
        <template #header><h2 class="font-semibold">Historie</h2></template>
        <p v-if="history.length === 0" class="text-sm text-muted">
          Objednávka je starší než historie; zatím tu nic není.
        </p>
        <ol v-else class="space-y-4">
          <li v-for="(event, index) in history" :key="index" class="flex gap-3 text-sm">
            <span
              class="mt-1.5 size-2 shrink-0 rounded-full"
              :class="index === 0 ? 'bg-primary' : 'bg-accented'"
            />
            <div class="min-w-0">
              <p class="font-medium text-highlighted">{{ ORDER_EVENT_LABELS[event.type] }}</p>
              <p class="text-xs text-muted">
                {{ formatDateTime(event.at) }}
                <template v-if="event.email">
                  ·
                  <span :class="{ 'text-error': event.email === 'failed' }">
                    {{ EMAIL_OUTCOME_LABELS[event.email] }}
                  </span>
                </template>
                <template v-if="event.restocked"> · kusy vráceny na sklad</template>
              </p>
              <p v-if="event.trackingNumber" class="text-xs text-muted">
                Zásilka {{ event.trackingNumber }}
              </p>
              <p v-if="event.message" class="mt-1 text-xs whitespace-pre-line text-default">
                „{{ event.message }}“
              </p>
            </div>
          </li>
        </ol>
      </UCard>

      <UCollapsible class="rounded-lg bg-default ring ring-default">
        <UButton
          label="Ruční úprava stavu"
          icon="i-lucide-wrench"
          trailing-icon="i-lucide-chevron-down"
          color="neutral"
          variant="ghost"
          block
          class="justify-start px-4 py-3"
        />
        <template #content>
          <div class="space-y-3 px-4 pb-4">
            <p class="text-xs text-muted">
              Jen na opravy: změna tady nic nepošle zákazníkovi ani nezmění sklad.
            </p>
            <UFormField label="Platba">
              <USelect
                :model-value="order.paymentStatus"
                :items="paymentStatusItems"
                class="w-full"
                @update:model-value="(value) => update.mutate({ paymentStatus: value })"
              />
            </UFormField>
            <UFormField label="Stav objednávky">
              <USelect
                :model-value="order.orderStatus"
                :items="orderStatusItems"
                class="w-full"
                @update:model-value="(value) => update.mutate({ orderStatus: value })"
              />
            </UFormField>
            <ConfirmDelete
              question="Smazat objednávku?"
              detail="Zmizí i z historie. Sklad se nevrátí — na zrušení je tlačítko „Zrušit objednávku“."
              :loading="remove.isPending.value"
              @confirm="remove.mutate()"
            />
          </div>
        </template>
      </UCollapsible>
    </div>
  </div>

  <UModal
    v-if="pending && order"
    v-model:open="dialogOpen"
    :title="ORDER_ACTION_LABELS[pending]"
    :description="ORDER_ACTION_HINTS[pending]"
  >
    <template #body>
      <form id="order-action" class="space-y-4" @submit.prevent="act.mutate(pending)">
        <UFormField
          v-if="pending === 'ship'"
          label="Číslo zásilky"
          :help="
            TRACKING_URLS[order.shippingMethod]
              ? 'Zákazník dostane odkaz na sledování.'
              : 'Nepovinné.'
          "
        >
          <UInput v-model="details.trackingNumber" class="w-full" autofocus />
        </UFormField>
        <UFormField
          v-if="NOTIFYING_ACTIONS.includes(pending) && details.notify"
          label="Zpráva pro zákazníka"
          help="Nepovinné. Přidá se do e-mailu."
        >
          <UTextarea
            v-model="details.message"
            :rows="3"
            autoresize
            class="w-full"
            :placeholder="
              pending === 'ready-for-pickup'
                ? 'Třeba: Vyzvednout si ji můžete ve čtvrtek od 16 do 18 h v ateliéru na Letné.'
                : ''
            "
          />
        </UFormField>
        <UCheckbox
          v-if="NOTIFYING_ACTIONS.includes(pending)"
          v-model="details.notify"
          label="Poslat zákazníkovi e-mail"
        />
        <UCheckbox
          v-if="pending === 'cancel'"
          v-model="details.restock"
          label="Vrátit kusy na sklad"
          description="Produkty budou zase v nabídce."
        />
      </form>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton label="Zpět" color="neutral" variant="ghost" @click="dialogOpen = false" />
        <UButton
          type="submit"
          form="order-action"
          :icon="ORDER_ACTION_ICONS[pending]"
          :label="ORDER_ACTION_LABELS[pending]"
          :color="pending === 'cancel' ? 'error' : 'primary'"
          :loading="act.isPending.value"
        />
      </div>
    </template>
  </UModal>
</template>
