<script setup lang="ts">
/** Asks before unsaved changes are dropped; opened through `confirmLeave` (`app/unsaved-changes.ts`). */
const emit = defineEmits<{ close: [leave: boolean] }>();
</script>

<template>
  <UModal
    title="Odejít bez uložení?"
    description="Změny ve formuláři se ztratí."
    :ui="{ footer: 'justify-end' }"
  >
    <template #footer>
      <UButton
        label="Zůstat"
        color="neutral"
        variant="ghost"
        autofocus
        @click="emit('close', false)"
      />
      <UButton label="Zahodit změny" color="error" @click="emit('close', true)" />
    </template>
  </UModal>
</template>
