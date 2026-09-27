<script setup lang="ts">
import { computed } from 'vue';
import { useToast } from '@nuxt/ui/composables';
import { useRouter } from 'vue-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { parseOrderItems } from '@klotilda/domain';
import type { Order, OrderStatus, PaymentStatus } from '@klotilda/domain';
import ConfirmDelete from '@/components/ConfirmDelete.vue';
import PageHeader from '@/components/PageHeader.vue';
import { services } from '@/app/api';
import { describeError } from '@/app/errors';
import { formatCzk, formatDateTime } from '@/app/format';
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
  PAYMENT_STATUS_LABELS,
  SHIPPING_LABELS,
  toSelectItems,
} from '@/app/labels';

const props = defineProps<{ id: string }>();

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
const orderStatusItems = toSelectItems(ORDER_STATUS_LABELS);
const paymentStatusItems = toSelectItems(PAYMENT_STATUS_LABELS);

const update = useMutation({
  mutationFn: (changes: { orderStatus?: OrderStatus; paymentStatus?: PaymentStatus }) =>
    services.orders.update(props.id, changes),
  onSuccess: (updated: Order) => {
    queryClient.setQueryData(['order', props.id], updated);
    void queryClient.invalidateQueries({ queryKey: ['orders'] });
    toast.add({ title: 'Uloženo', color: 'success' });
  },
  onError: (err) => toast.add({ title: describeError(err), color: 'error' }),
});

const setPaymentStatus = (paymentStatus: PaymentStatus) => update.mutate({ paymentStatus });
const setOrderStatus = (orderStatus: OrderStatus) => update.mutate({ orderStatus });

const remove = useMutation({
  mutationFn: () => services.orders.delete(props.id),
  onSuccess: async () => {
    void queryClient.invalidateQueries({ queryKey: ['orders'] });
    toast.add({ title: 'Objednávka smazána', color: 'success' });
    await router.push({ name: 'orders' });
  },
  onError: (err) => toast.add({ title: describeError(err), color: 'error' }),
});
</script>

<template>
  <PageHeader
    :title="order ? `Objednávka ${order.variableSymbol}` : 'Objednávka'"
    :back="{ name: 'orders' }"
  >
    <template v-if="order" #actions>
      <ConfirmDelete
        question="Smazat objednávku?"
        detail="Sklad se nevrátí; u zrušené objednávky upravte počty kusů v produktech."
        :loading="remove.isPending.value"
        @confirm="remove.mutate()"
      />
    </template>
  </PageHeader>

  <UAlert v-if="isError" title="Objednávku se nepodařilo načíst." color="error" variant="soft" />
  <USkeleton v-else-if="isPending" class="h-64 w-full" />
  <div v-else-if="order" class="grid gap-4 lg:grid-cols-3">
    <div class="space-y-4 lg:col-span-2">
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
        <template #header><h2 class="font-semibold">Zákazník</h2></template>
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
          <template v-if="order.notes">
            <dt class="text-muted">Poznámka</dt>
            <dd class="whitespace-pre-line">{{ order.notes }}</dd>
          </template>
          <dt class="text-muted">Přijato</dt>
          <dd>{{ formatDateTime(order.createdAt) }}</dd>
        </dl>
      </UCard>
    </div>

    <div class="space-y-4">
      <UCard>
        <template #header><h2 class="font-semibold">Platba</h2></template>
        <div class="space-y-3">
          <UBadge
            :label="PAYMENT_STATUS_LABELS[order.paymentStatus]"
            :color="PAYMENT_STATUS_COLORS[order.paymentStatus]"
            variant="subtle"
            size="lg"
          />
          <p class="text-sm text-muted">
            Na účtu hledejte variabilní symbol
            <strong class="text-highlighted">{{ order.variableSymbol }}</strong> a částku
            <strong class="text-highlighted">{{ formatCzk(order.totalAmount) }}</strong
            >.
          </p>
          <UButton
            v-if="order.paymentStatus === 'pending'"
            icon="i-lucide-check"
            label="Platba dorazila"
            block
            :loading="update.isPending.value"
            @click="update.mutate({ paymentStatus: 'paid' })"
          />
          <UFormField label="Stav platby">
            <USelect
              :model-value="order.paymentStatus"
              :items="paymentStatusItems"
              class="w-full"
              @update:model-value="setPaymentStatus"
            />
          </UFormField>
        </div>
      </UCard>

      <UCard>
        <template #header><h2 class="font-semibold">Vyřízení</h2></template>
        <UFormField label="Stav objednávky">
          <USelect
            :model-value="order.orderStatus"
            :items="orderStatusItems"
            class="w-full"
            @update:model-value="setOrderStatus"
          />
        </UFormField>
      </UCard>
    </div>
  </div>
</template>
