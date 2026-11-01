<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router';
import { PAGE_ACTIONS_ID, PAGE_HEADING_ID } from './page-header';

defineProps<{
  title: string;
  /** Where the back arrow goes; no arrow without it. */
  back?: RouteLocationRaw;
}>();
</script>

<template>
  <!-- Rendered into the layout's top bar, which stays in place while the page scrolls. -->
  <Teleport defer :to="`#${PAGE_HEADING_ID}`">
    <UButton
      v-if="back"
      :to="back"
      icon="i-lucide-arrow-left"
      color="neutral"
      variant="ghost"
      aria-label="Zpět"
    />
    <h1 class="truncate text-base font-semibold text-highlighted sm:text-lg">{{ title }}</h1>
  </Teleport>
  <Teleport v-if="$slots.actions" defer :to="`#${PAGE_ACTIONS_ID}`">
    <slot name="actions" />
  </Teleport>
</template>
