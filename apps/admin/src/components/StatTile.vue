<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router';

defineProps<{
  label: string;
  icon: string;
  value?: string | number;
  /** A skeleton instead of the value, and no hint. */
  loading?: boolean;
  hint?: string;
  /** The hint asks for action: shown in the error colour, with an icon. */
  alert?: boolean;
  /** Makes the whole tile a link. */
  to?: RouteLocationRaw;
}>();
</script>

<template>
  <component
    :is="to ? 'RouterLink' : 'div'"
    :to="to"
    class="flex flex-col gap-1 rounded-lg bg-default p-4 ring ring-default transition"
    :class="{ 'hover:ring-primary focus-visible:ring-2 focus-visible:ring-primary': to }"
  >
    <div class="flex items-start justify-between gap-2 text-sm text-muted">
      <span class="min-w-0">{{ label }}</span>
      <UIcon :name="icon" class="mt-0.5 size-4 shrink-0" />
    </div>
    <USkeleton v-if="loading" class="my-1 h-7 w-20" />
    <p v-else class="text-2xl font-semibold text-highlighted">{{ value }}</p>
    <p
      v-if="hint && !loading"
      class="flex items-center gap-1 text-xs"
      :class="alert ? 'text-error' : 'text-muted'"
    >
      <UIcon v-if="alert" name="i-lucide-clock-alert" class="size-3.5 shrink-0" />
      {{ hint }}
    </p>
  </component>
</template>
