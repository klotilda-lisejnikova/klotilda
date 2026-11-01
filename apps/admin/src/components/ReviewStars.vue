<script setup lang="ts">
import { MAX_RATING } from '@klotilda/domain';

defineProps<{ rating: number }>();
</script>

<template>
  <span class="inline-flex text-warning" role="img" :aria-label="`${rating} z ${MAX_RATING} hvězd`">
    <UIcon
      v-for="star in MAX_RATING"
      :key="star"
      name="i-lucide-star"
      class="size-4"
      :class="star <= rating ? 'fill-current' : 'text-dimmed'"
    />
  </span>
</template>
