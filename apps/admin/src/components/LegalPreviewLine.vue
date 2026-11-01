<script setup lang="ts">
import type { InlineLine } from '@klotilda/domain';

defineProps<{ line: InlineLine }>();
</script>

<template>
  <template v-for="(span, index) in line" :key="index">
    <strong v-if="span.kind === 'bold'" class="font-semibold">{{ span.text }}</strong>
    <!-- A link of the website, shown but not followed: its paths aren't the admin's. -->
    <span
      v-else-if="span.kind === 'link'"
      class="text-primary underline underline-offset-2"
      :title="span.href"
      >{{ span.label }}</span
    >
    <template v-else>{{ span.text }}</template>
  </template>
</template>
