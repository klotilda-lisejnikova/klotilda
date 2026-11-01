<script setup lang="ts">
import { computed } from 'vue';
import { parseLegalText } from '@klotilda/domain';
import LegalPreviewLine from './LegalPreviewLine.vue';

const props = defineProps<{
  /** The text with its placeholders filled (`fillLegalText`). */
  source: string;
}>();

/** The blocks as the website shows them (`parseLegalText`); Vue escapes every piece of text. */
const blocks = computed(() => parseLegalText(props.source));
</script>

<template>
  <div class="text-sm leading-relaxed text-default">
    <template v-for="(block, index) in blocks" :key="index">
      <h2
        v-if="block.kind === 'heading' && block.level === 2"
        class="mt-6 mb-2 text-base font-semibold text-highlighted first:mt-0"
      >
        <LegalPreviewLine :line="block.spans" />
        <span v-if="block.id" class="ml-2 text-xs font-normal text-dimmed">#{{ block.id }}</span>
      </h2>
      <h3 v-else-if="block.kind === 'heading'" class="mt-4 mb-1 font-medium text-highlighted">
        <LegalPreviewLine :line="block.spans" />
      </h3>
      <component
        :is="block.ordered ? 'ol' : 'ul'"
        v-else-if="block.kind === 'list'"
        :class="['mb-3 space-y-1 pl-5', block.ordered ? 'list-decimal' : 'list-disc']"
      >
        <li v-for="(item, itemIndex) in block.items" :key="itemIndex">
          <LegalPreviewLine :line="item" />
        </li>
      </component>
      <p
        v-else
        :class="[
          'mb-3',
          block.kind === 'note' && 'border-l-2 border-primary bg-elevated px-3 py-2 text-muted',
        ]"
      >
        <template v-for="(line, lineIndex) in block.lines" :key="lineIndex">
          <br v-if="lineIndex > 0" />
          <LegalPreviewLine :line="line" />
        </template>
      </p>
    </template>
  </div>
</template>
