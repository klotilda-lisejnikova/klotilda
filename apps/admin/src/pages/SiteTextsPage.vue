<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { useToast } from '@nuxt/ui/composables';
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { SITE_TEXT_KEYS, UNTRANSLATED_SITE_TEXTS, siteTextFields } from '@klotilda/domain';
import type { SiteText, SiteTextKey } from '@klotilda/domain';
import PageHeader from '@/components/PageHeader.vue';
import SaveBar from '@/components/SaveBar.vue';
import { services } from '@/app/api';
import { describeError } from '@/app/errors';
import { SITE_TEXT_LABELS } from '@/app/labels';
import { useUnsavedChanges } from '@/app/unsaved-changes';

type Language = 'cs' | 'en';
/** One field per text and language (`home.about.title:cs`): the form stays flat, compared field by field. */
type FieldName = `${SiteTextKey}:${Language}`;
type TextsForm = Record<FieldName, string>;

const SITE_TEXTS_QUERY_KEY = ['site-texts'];
const TEXT_MAX_LENGTH = siteTextFields.text_cs.maxLength;
/** The API's page limit: every row, a stray one past the keys included. */
const SITE_TEXTS_LIMIT = 50;

const toast = useToast();
const queryClient = useQueryClient();
const {
  data: rows,
  isPending,
  isError,
} = useQuery({
  queryKey: SITE_TEXTS_QUERY_KEY,
  queryFn: async (): Promise<SiteText[]> =>
    (await services.siteTexts.getAll({ limit: SITE_TEXTS_LIMIT })).data,
});
const byKey = computed(() => new Map(rows.value?.map((row) => [row.key, row])));

/** The keys of the site, section by section, in the order the home page shows them. */
const sections = computed(() => {
  const grouped = new Map<string, SiteTextKey[]>();
  for (const key of SITE_TEXT_KEYS) {
    const { section } = SITE_TEXT_LABELS[key];
    grouped.set(section, [...(grouped.get(section) ?? []), key]);
  }
  return [...grouped];
});

const field = (key: SiteTextKey, language: Language): FieldName => `${key}:${language}`;
/** The same in both languages (an address): no English field. */
const isUntranslated = (key: SiteTextKey) => UNTRANSLATED_SITE_TEXTS.includes(key);

/** Every text as the form edits it; a missing row as empty. */
function toTextsForm(loaded: readonly SiteText[] = []): TextsForm {
  const rowsByKey = new Map(loaded.map((row) => [row.key, row]));
  const entries = SITE_TEXT_KEYS.flatMap((key) => [
    [field(key, 'cs'), rowsByKey.get(key)?.text_cs ?? ''],
    [field(key, 'en'), rowsByKey.get(key)?.text_en ?? ''],
  ]);
  return Object.fromEntries(entries) as TextsForm;
}

const form = reactive<TextsForm>(toTextsForm());
const changes = useUnsavedChanges(form);

watch(
  rows,
  (loaded) => {
    if (loaded) changes.load(toTextsForm(loaded));
  },
  { immediate: true }
);

/** The texts with a changed field, each once. */
const changedKeys = () =>
  [...new Set(changes.changed.value.map((name) => name.split(':')[0] as SiteTextKey))].filter(
    (key) => byKey.value.has(key)
  );

/** Saves one text; an empty or untranslated English text is none (the website shows the Czech one). */
function saveText(key: SiteTextKey, sent: TextsForm) {
  const english = isUntranslated(key) ? '' : sent[field(key, 'en')];
  return services.siteTexts.update(byKey.value.get(key)!.id, {
    text_cs: sent[field(key, 'cs')],
    text_en: english.trim() === '' ? null : english,
  });
}

/** Saves the texts that changed, as they were when sent. */
const save = useMutation({
  mutationFn: async (sent: TextsForm) => {
    await Promise.all(changedKeys().map((key) => saveText(key, sent)));
  },
  onSuccess: (_saved, sent) => {
    changes.markSaved(sent);
    toast.add({ title: 'Uloženo, web se během chvíle obnoví', color: 'success' });
  },
  onError: (err) => toast.add({ title: describeError(err), color: 'error' }),
  onSettled: () => queryClient.invalidateQueries({ queryKey: SITE_TEXTS_QUERY_KEY }),
});

function submit() {
  save.mutate({ ...form });
}
</script>

<template>
  <PageHeader title="Texty webu" />

  <p class="mb-4 max-w-2xl text-sm text-muted">
    Texty na úvodní stránce webu a popis pro vyhledávače. Anglický text je nepovinný: dokud je
    prázdný, anglická verze webu ukazuje český. Popisky tlačítek a e-shopu zůstávají, jak jsou.
  </p>

  <UAlert v-if="isError" title="Texty se nepodařilo načíst." color="error" variant="soft" />
  <USkeleton v-else-if="isPending" class="h-96 max-w-4xl" />
  <form v-else class="max-w-4xl space-y-4" @submit.prevent="submit">
    <UCard v-for="[section, keys] in sections" :key="section">
      <template #header>
        <h2 class="font-semibold">{{ section }}</h2>
      </template>
      <div class="space-y-5">
        <div v-for="key in keys" :key="key">
          <UAlert
            v-if="!byKey.has(key)"
            :title="`${SITE_TEXT_LABELS[key].label}: v databázi chybí, web ukazuje výchozí text.`"
            color="warning"
            variant="soft"
          />
          <div
            v-else
            :class="['grid grid-cols-1 gap-x-4', !isUntranslated(key) && 'sm:grid-cols-2']"
          >
            <UFormField
              :label="SITE_TEXT_LABELS[key].label"
              :help="SITE_TEXT_LABELS[key].help"
              :hint="isUntranslated(key) ? undefined : 'česky'"
            >
              <UTextarea
                v-if="SITE_TEXT_LABELS[key].long"
                v-model="form[field(key, 'cs')]"
                :rows="4"
                autoresize
                :maxlength="TEXT_MAX_LENGTH"
                class="w-full"
              />
              <UInput
                v-else
                v-model="form[field(key, 'cs')]"
                :maxlength="TEXT_MAX_LENGTH"
                class="w-full"
              />
            </UFormField>
            <UFormField
              v-if="!isUntranslated(key)"
              :label="SITE_TEXT_LABELS[key].label"
              hint="anglicky"
            >
              <UTextarea
                v-if="SITE_TEXT_LABELS[key].long"
                v-model="form[field(key, 'en')]"
                :rows="4"
                autoresize
                :maxlength="TEXT_MAX_LENGTH"
                :placeholder="form[field(key, 'cs')]"
                class="w-full"
              />
              <UInput
                v-else
                v-model="form[field(key, 'en')]"
                :maxlength="TEXT_MAX_LENGTH"
                :placeholder="form[field(key, 'cs')]"
                class="w-full"
              />
            </UFormField>
          </div>
        </div>
      </div>
    </UCard>

    <SaveBar
      :dirty="changes.dirty.value"
      :saving="save.isPending.value"
      :cancel-to="{ name: 'overview' }"
    />
  </form>
</template>
