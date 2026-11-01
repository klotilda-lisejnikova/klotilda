<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router';

defineProps<{
  /** The form holds changes not saved yet. */
  dirty: boolean;
  saving: boolean;
  /** Where "Zrušit" leads (it asks first when there are changes). */
  cancelTo: RouteLocationRaw;
  /** A new row is saved even untouched; an existing one only once something changed. */
  isNew?: boolean;
}>();
</script>

<template>
  <!-- Inside the form, kept in view while it scrolls (above the panel's bottom padding). -->
  <div
    class="sticky bottom-0 z-10 flex items-center gap-2 rounded-lg bg-default/90 px-4 py-3 shadow-sm ring ring-default backdrop-blur"
  >
    <p class="mr-auto flex items-center gap-2 text-sm" aria-live="polite">
      <template v-if="dirty">
        <span class="size-2 rounded-full bg-warning" aria-hidden="true" />
        Neuložené změny
      </template>
      <span v-else-if="!isNew" class="text-muted">Vše uloženo</span>
    </p>
    <UButton :to="cancelTo" label="Zrušit" color="neutral" variant="ghost" />
    <UButton
      type="submit"
      label="Uložit"
      icon="i-lucide-save"
      :loading="saving"
      :disabled="!dirty && !isNew"
    />
  </div>
</template>
