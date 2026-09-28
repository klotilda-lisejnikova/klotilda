<script setup lang="ts">
import { ref } from 'vue';

defineProps<{
  /** What goes, for the question: „Smazat produkt Váza?" */
  question: string;
  /** What else goes with it. */
  detail?: string;
  loading?: boolean;
  /** Only the bin, for a row in a list. */
  compact?: boolean;
}>();
const emit = defineEmits<{ confirm: [] }>();

const open = ref(false);

function confirm() {
  open.value = false;
  emit('confirm');
}
</script>

<template>
  <UModal v-model:open="open" :title="question" :description="detail">
    <UButton
      v-if="compact"
      icon="i-lucide-trash-2"
      color="error"
      variant="ghost"
      aria-label="Smazat"
      :loading="loading"
    />
    <UButton
      v-else
      icon="i-lucide-trash-2"
      label="Smazat"
      color="error"
      variant="soft"
      :loading="loading"
    />
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton label="Nechat" color="neutral" variant="ghost" @click="open = false" />
        <UButton label="Smazat" color="error" @click="confirm" />
      </div>
    </template>
  </UModal>
</template>
