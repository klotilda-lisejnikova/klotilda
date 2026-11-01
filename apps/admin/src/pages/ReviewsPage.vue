<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useToast } from '@nuxt/ui/composables';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import {
  MAX_RATING,
  parseReviewedItems,
  REVIEW_HIDDEN_REASON_MAX_LENGTH,
  REVIEW_REPLY_MAX_LENGTH,
} from '@klotilda/domain';
import type { Review, ReviewStatus } from '@klotilda/domain';
import ConfirmDelete from '@/components/ConfirmDelete.vue';
import PageHeader from '@/components/PageHeader.vue';
import ReviewStars from '@/components/ReviewStars.vue';
import { services } from '@/app/api';
import { describeError } from '@/app/errors';
import { formatDateTime } from '@/app/format';
import { REVIEW_LOCALE_LABELS } from '@/app/labels';
import { useQueryTab } from '@/app/query-tabs';
import { REVIEW_TABS, REVIEWS_QUERY_KEY, usePendingReviewCount } from '@/app/reviews';

const PAGE_SIZE = 20;

const toast = useToast();
const queryClient = useQueryClient();

const { data: pendingCount } = usePendingReviewCount();
const counts = computed(() =>
  pendingCount.value === undefined ? undefined : { pending: pendingCount.value }
);
const {
  current: tab,
  select: selectTab,
  items: tabs,
  selectItems,
} = useQueryTab(REVIEW_TABS, 'status', counts);

const page = ref(1);
watch(tab, () => {
  page.value = 1;
});

const { data, isPending, isError, isPlaceholderData } = useQuery({
  queryKey: [...REVIEWS_QUERY_KEY, 'list', { status: () => tab.value.value, page }],
  queryFn: () =>
    services.reviews.getAll({
      filter: { status: [tab.value.value] },
      page: page.value,
      limit: PAGE_SIZE,
    }),
  placeholderData: keepPreviousData,
});
const reviews = computed(() => data.value?.data ?? []);
const total = computed(() => data.value?.total ?? 0);

/** A page that emptied (its last review moved to another tab) gives way to the last one left. */
watch(total, (count) => {
  if (isPlaceholderData.value) return;
  const lastPage = Math.max(1, Math.ceil(count / PAGE_SIZE));
  if (page.value > lastPage) page.value = lastPage;
});

/** The reply being written, per review, until it is saved. */
const replies = reactive(new Map<string, string>());
const replyOf = (review: Review) => replies.get(review.id) ?? review.reply ?? '';
const replyChanged = (review: Review) => replyOf(review).trim() !== (review.reply ?? '').trim();

const refresh = () => queryClient.invalidateQueries({ queryKey: REVIEWS_QUERY_KEY });

/** What the admin changes of a review: the status, the hidden reason, the reply. */
type ReviewChanges = Parameters<typeof services.reviews.update>[1];

const STATUS_TOASTS: Record<ReviewStatus, string> = {
  published: 'Recenze je na webu',
  hidden: 'Recenze je skrytá',
  pending: 'Recenze čeká na schválení',
};

/** The reviews with a save or a delete on its way, so their buttons wait. */
const inFlight = reactive(new Set<string>());
const busy = (review: Review) => inFlight.has(review.id);

const save = useMutation({
  mutationFn: ({ review, changes }: { review: Review; changes: ReviewChanges }) =>
    services.reviews.update(review.id, changes),
  onMutate: ({ review }) => void inFlight.add(review.id),
  onSuccess: (_saved, { review, changes }) => {
    // Only the draft that was sent is done; text typed meanwhile stays.
    if (changes.reply !== undefined && replies.get(review.id)?.trim() === changes.reply) {
      replies.delete(review.id);
    }
    if (changes.status === 'hidden') hiding.open = false;
    toast.add({
      title: changes.status ? STATUS_TOASTS[changes.status] : 'Odpověď je uložená',
      color: 'success',
    });
  },
  onError: (err) => toast.add({ title: describeError(err), color: 'error' }),
  onSettled: (_saved, _err, { review }) => {
    inFlight.delete(review.id);
    void refresh();
  },
});

const remove = useMutation({
  mutationFn: (review: Review) => services.reviews.delete(review.id),
  onMutate: (review) => void inFlight.add(review.id),
  onSuccess: () => toast.add({ title: 'Recenze je smazaná', color: 'success' }),
  onError: (err) => toast.add({ title: describeError(err), color: 'error' }),
  onSettled: (_done, _err, review) => {
    inFlight.delete(review.id);
    void refresh();
  },
});

// ── Hiding asks why: the note stays in the admin ─────────────────────
const hiding = reactive({ open: false, review: null as Review | null, reason: '' });
const hidingReady = computed(
  () => hiding.review !== null && hiding.reason.trim() !== '' && !busy(hiding.review)
);

function askToHide(review: Review) {
  Object.assign(hiding, { open: true, review, reason: review.hiddenReason ?? '' });
}

/** The dialog closes once the review is hidden; on a failure the reason typed stays. */
function hide() {
  if (!hiding.review || !hidingReady.value) return;
  save.mutate({
    review: hiding.review,
    changes: { status: 'hidden', hiddenReason: hiding.reason.trim() },
  });
}
</script>

<template>
  <PageHeader title="Recenze" />

  <p class="mb-4 max-w-2xl text-sm text-muted">
    Recenze píšou jen zákazníci, kterým objednávka dorazila, přes odkaz z e-mailu. Na webu se ukáže
    až ta, kterou zveřejníte. Zveřejňujte i ty kritické: skrýt jde jen recenzi sprostou, urážlivou,
    se spamem nebo s cizími osobními údaji. Text zákazníka upravit nejde, můžete na něj ale veřejně
    odpovědět.
  </p>

  <UTabs
    :model-value="tab.value"
    :items="tabs"
    :content="false"
    variant="link"
    class="mb-4 hidden sm:flex"
    @update:model-value="selectTab"
  />
  <USelect
    :model-value="tab.value"
    :items="selectItems"
    aria-label="Které recenze"
    class="mb-4 w-full sm:hidden"
    @update:model-value="selectTab"
  />

  <UAlert v-if="isError" title="Recenze se nepodařilo načíst." color="error" variant="soft" />
  <div v-else-if="isPending" class="max-w-3xl space-y-3">
    <USkeleton v-for="line in 3" :key="line" class="h-36 w-full" />
  </div>
  <p v-else-if="reviews.length === 0" class="py-10 text-center text-sm text-muted">
    {{
      tab.value === 'pending'
        ? 'Žádná recenze nečeká na schválení.'
        : tab.value === 'published'
          ? 'Zatím žádná zveřejněná recenze.'
          : 'Žádná skrytá recenze.'
    }}
  </p>

  <ul v-else class="max-w-3xl space-y-3">
    <li
      v-for="review in reviews"
      :key="review.id"
      class="space-y-3 rounded-lg bg-default p-4 ring ring-default"
    >
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
        <ReviewStars :rating="review.rating" />
        <span class="text-sm text-muted">{{ review.rating }} z {{ MAX_RATING }}</span>
        <span class="font-medium text-highlighted">{{ review.authorName }}</span>
        <UBadge
          v-if="review.locale !== 'cs'"
          :label="REVIEW_LOCALE_LABELS[review.locale]"
          color="neutral"
          variant="soft"
          size="sm"
        />
        <span class="ml-auto text-xs text-muted">{{ formatDateTime(review.createdAt) }}</span>
      </div>

      <p class="whitespace-pre-line text-default">{{ review.body }}</p>

      <p class="text-xs text-muted">
        Koupeno:
        {{
          parseReviewedItems(review)
            .map((item) => item.name)
            .join(', ')
        }}
        ·
        <ULink :to="{ name: 'order', params: { id: review.orderId } }" class="underline">
          objednávka
        </ULink>
      </p>

      <UAlert
        v-if="review.status === 'hidden' && review.hiddenReason"
        :title="`Skryto: ${review.hiddenReason}`"
        color="neutral"
        variant="soft"
        icon="i-lucide-eye-off"
      />

      <UFormField label="Vaše odpověď (na webu pod recenzí)" :name="`reply-${review.id}`">
        <UTextarea
          :model-value="replyOf(review)"
          :rows="2"
          autoresize
          :maxrows="8"
          placeholder="Děkuji za…"
          :maxlength="REVIEW_REPLY_MAX_LENGTH"
          class="w-full"
          @update:model-value="(value) => replies.set(review.id, String(value))"
        />
      </UFormField>

      <div class="flex flex-wrap items-center gap-2">
        <UButton
          v-if="review.status !== 'published'"
          icon="i-lucide-check"
          label="Zveřejnit"
          :loading="busy(review)"
          @click="save.mutate({ review, changes: { status: 'published' } })"
        />
        <UButton
          v-if="review.status !== 'hidden'"
          icon="i-lucide-eye-off"
          label="Skrýt"
          color="neutral"
          variant="soft"
          :disabled="busy(review)"
          @click="askToHide(review)"
        />
        <UButton
          v-if="replyChanged(review)"
          icon="i-lucide-message-square-reply"
          label="Uložit odpověď"
          color="neutral"
          variant="soft"
          :loading="busy(review)"
          @click="save.mutate({ review, changes: { reply: replyOf(review).trim() } })"
        />
        <div class="ml-auto">
          <ConfirmDelete
            question="Smazat recenzi?"
            detail="Smazání nejde vrátit. Recenze zmizí z webu i z adminu. Smažte ji, když o to zákazník požádá."
            compact
            :loading="busy(review)"
            @confirm="remove.mutate(review)"
          />
        </div>
      </div>
    </li>
  </ul>

  <UPagination
    v-if="total > PAGE_SIZE"
    v-model:page="page"
    :total="total"
    :items-per-page="PAGE_SIZE"
    class="mt-4"
  />

  <UModal
    v-model:open="hiding.open"
    title="Skrýt recenzi?"
    description="Z webu zmizí. Skrývejte jen recenzi sprostou, urážlivou, se spamem nebo s cizími osobními údaji, ne kritickou."
  >
    <template #body>
      <UFormField label="Proč (vidíte jen vy)" name="hiddenReason">
        <UInput
          v-model="hiding.reason"
          placeholder="např. vulgarita"
          :maxlength="REVIEW_HIDDEN_REASON_MAX_LENGTH"
          class="w-full"
          @keydown.enter="hide"
        />
      </UFormField>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton label="Nechat" color="neutral" variant="ghost" @click="hiding.open = false" />
        <UButton
          label="Skrýt"
          color="neutral"
          :disabled="!hidingReady"
          :loading="hiding.review !== null && busy(hiding.review)"
          @click="hide"
        />
      </div>
    </template>
  </UModal>
</template>
