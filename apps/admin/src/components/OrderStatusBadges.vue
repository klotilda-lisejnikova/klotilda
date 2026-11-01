<script setup lang="ts">
import type { BadgeProps } from '@nuxt/ui';
import type { Order } from '@klotilda/domain';
import {
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
  PAYMENT_STATUS_LABELS,
} from '@/app/labels';

defineProps<{
  order: Pick<Order, 'paymentStatus' | 'orderStatus'>;
  size?: BadgeProps['size'];
}>();
</script>

<template>
  <!-- Where an order stands: its payment, then its own status. -->
  <UBadge
    :label="PAYMENT_STATUS_LABELS[order.paymentStatus]"
    :color="PAYMENT_STATUS_COLORS[order.paymentStatus]"
    variant="subtle"
    :size="size"
  />
  <UBadge
    :label="ORDER_STATUS_LABELS[order.orderStatus]"
    :color="ORDER_STATUS_COLORS[order.orderStatus]"
    variant="subtle"
    :size="size"
  />
</template>
