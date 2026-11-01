<script setup lang="ts">
import { DEFAULT_REVIEW_STATUS } from '@klotilda/domain';
import type { Review } from '@klotilda/domain';
import ReviewStars from '@/components/ReviewStars.vue';
import { REVIEW_STATUS_LABELS } from '@/app/labels';

/** The order's review on its detail, or the button that sends the link to write one again. */
defineProps<{
  delivered: boolean;
  review: Review | null;
  loading: boolean;
  failed: boolean;
  requesting: boolean;
}>();
defineEmits<{ request: [] }>();
</script>

<template>
  <UCard v-if="delivered || review">
    <template #header><h2 class="font-semibold">Recenze</h2></template>
    <USkeleton v-if="loading" class="h-12 w-full" />
    <UAlert v-else-if="failed" title="Recenzi se nepodařilo načíst." color="error" variant="soft" />
    <div v-else-if="review" class="space-y-2 text-sm">
      <div class="flex flex-wrap items-center gap-2">
        <ReviewStars :rating="review.rating" />
        <span class="font-medium text-highlighted">{{ review.authorName }}</span>
        <UBadge
          :label="REVIEW_STATUS_LABELS[review.status ?? DEFAULT_REVIEW_STATUS]"
          color="neutral"
          variant="soft"
          size="sm"
        />
      </div>
      <p class="line-clamp-4 whitespace-pre-line">{{ review.body }}</p>
      <UButton
        label="Otevřít v recenzích"
        trailing-icon="i-lucide-arrow-right"
        color="neutral"
        variant="link"
        class="px-0"
        :to="{
          name: 'reviews',
          query: review.status === DEFAULT_REVIEW_STATUS ? {} : { status: review.status },
        }"
      />
    </div>
    <div v-else class="space-y-2 text-sm">
      <p class="text-muted">
        Zákazník zatím nenapsal. Odkaz na recenzi mu přišel s e-mailem o předání; můžete mu ho
        poslat znovu.
      </p>
      <UButton
        icon="i-lucide-send"
        label="Požádat o recenzi"
        color="neutral"
        variant="soft"
        :loading="requesting"
        @click="$emit('request')"
      />
    </div>
  </UCard>
</template>
