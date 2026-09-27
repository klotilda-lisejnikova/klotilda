<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router';

defineProps<{
  title: string;
  /** Where the back arrow goes; no arrow without it. */
  back?: RouteLocationRaw;
}>();
</script>

<template>
  <header class="mb-6 flex flex-wrap items-center gap-3">
    <UButton
      v-if="back"
      :to="back"
      icon="i-lucide-arrow-left"
      color="neutral"
      variant="ghost"
      aria-label="Zpět"
    />
    <h1 class="mr-auto text-xl font-semibold text-highlighted">{{ title }}</h1>
    <slot name="actions" />
  </header>
</template>
