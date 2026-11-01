<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useToast } from '@nuxt/ui/composables';
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { ApiError } from '@eleansphere/entity-core';
import {
  fillLegalText,
  formatCzechDate,
  LEGAL_PLACEHOLDERS,
  DEFAULT_LEGAL_SELLER,
  legalDocumentVersionFields,
  legalSellerSnapshot,
  legalTextFor,
  legalTextProblems,
  legalVersionDate,
} from '@klotilda/domain';
import type {
  LegalDocumentKey,
  LegalDocumentVersion,
  LegalDraftRequest,
  PublishedLegalVersion,
} from '@klotilda/domain';
import LegalPreview from '@/components/LegalPreview.vue';
import ConfirmDelete from '@/components/ConfirmDelete.vue';
import PageHeader from '@/components/PageHeader.vue';
import SaveBar from '@/components/SaveBar.vue';
import { services } from '@/app/api';
import { describeError } from '@/app/errors';
import { LEGAL_DOCUMENT_LABELS, LEGAL_PLACEHOLDER_LABELS } from '@/app/labels';
import {
  LEGAL_VERSIONS_QUERY_KEY,
  nextEffectiveFrom,
  useLegalVersions,
} from '@/app/legal-documents';
import { useSeller } from '@/app/seller';
import { useUnsavedChanges } from '@/app/unsaved-changes';
import { formSchema, VALIDATE_ON } from '@/app/validation';

const props = defineProps<{ document: LegalDocumentKey }>();

interface DraftForm {
  body_cs: string;
  body_en: string;
}

const NOT_FOUND = 404;
/** The draft routes' refusals whose message is the API's own Czech reason. */
const EXPLAINED_STATUSES = [400, NOT_FOUND, 409];
const LANGUAGES = [
  { label: 'Čeština', value: 'cs' },
  { label: 'English', value: 'en' },
];
const EMPTY_FORM: DraftForm = { body_cs: '', body_en: '' };

const toast = useToast();
const queryClient = useQueryClient();
const { byDocument, isPending, isError } = useLegalVersions();
const { data: seller } = useSeller();
const labels = computed(() => LEGAL_DOCUMENT_LABELS[props.document]);
const rows = computed(() => byDocument.value[props.document]);
const draft = computed(() => rows.value.draft);
const current = computed(() => rows.value.published[0]);

const form = reactive<DraftForm>({ ...EMPTY_FORM });
const changes = useUnsavedChanges(form);
const schema = formSchema(
  { body_cs: legalDocumentVersionFields.body_cs, body_en: legalDocumentVersionFields.body_en },
  'create'
);

/** A draft as the form edits it. */
function toForm(loaded: LegalDocumentVersion): DraftForm {
  return { body_cs: loaded.body_cs, body_en: loaded.body_en ?? '' };
}

/** The form's texts as the API takes them; an empty English text is none. */
function toRequest(sent: DraftForm): LegalDraftRequest {
  return { body_cs: sent.body_cs, body_en: sent.body_en.trim() === '' ? null : sent.body_en };
}

watch(
  draft,
  (loaded) => {
    if (loaded) changes.load(toForm(loaded));
  },
  { immediate: true }
);

/** The language edited and previewed (`LANGUAGES`). */
const language = ref('cs');

/** How a placeholder is written in the text (`{{sellerName}}`). */
const token = (name: string) => `{{${name}}}`;

/** What publishing would refuse, for each text the draft has. */
const problems = computed(() => {
  const czech = legalTextProblems(props.document, form.body_cs);
  const english =
    form.body_en.trim() === ''
      ? []
      : legalTextProblems(props.document, form.body_en).map(
          (problem) => `Anglický text: ${problem}`
        );
  return [...czech, ...english];
});

// ── What the preview shows: the draft, or a published version picked from the list ────
/** The published version picked; none shows the draft (without one, the version in force). */
const picked = ref<string>();
const shownVersion = computed(
  () => picked.value ?? (draft.value ? undefined : (current.value?.version ?? undefined))
);

const { data: shownPublished } = useQuery({
  queryKey: computed(() => ['legal-version', props.document, shownVersion.value]),
  queryFn: (): Promise<PublishedLegalVersion> =>
    services.legalDocuments.version(props.document, shownVersion.value!),
  enabled: computed(() => shownVersion.value !== undefined),
  staleTime: Infinity,
});

/** "Now" for the draft's date; set again when the publish dialog opens, so it names the right day. */
const now = ref(new Date());
/** The day the draft would apply from, published now. */
const draftEffectiveFrom = computed(() => nextEffectiveFrom(rows.value.published, now.value));

/** What is shown: the draft as it would read today, or a published version as it was. */
const shownTexts = computed(() =>
  shownVersion.value === undefined
    ? legalTextFor(form, language.value)
    : shownPublished.value?.version === shownVersion.value
      ? legalTextFor(shownPublished.value, language.value)
      : undefined
);

/** The draft's placeholders filled as publishing would: today's seller, or the API's defaults. */
function fillDraft(text: string): string {
  const snapshot = seller.value ? legalSellerSnapshot(seller.value) : DEFAULT_LEGAL_SELLER;
  return fillLegalText(text, snapshot, draftEffectiveFrom.value);
}

const previewSource = computed(() => {
  const texts = shownTexts.value;
  if (!texts) return undefined;
  if (shownVersion.value === undefined) return fillDraft(texts.text);
  const published = shownPublished.value!;
  return fillLegalText(texts.text, published.seller, published.effectiveFrom);
});

const czechOnly = computed(() => shownTexts.value?.czechOnly === true);

/** The version's day, as the pages show it. */
const versionDay = (row: LegalDocumentVersion) =>
  formatCzechDate(legalVersionDate(String(row.version)));
/** The version's name when it says more than its day (`2026-11-02-2`). */
const versionSuffix = (row: LegalDocumentVersion) => String(row.version).slice(10);

// ── The draft's life: start, save, drop, publish ────
function refreshVersions() {
  return queryClient.invalidateQueries({ queryKey: LEGAL_VERSIONS_QUERY_KEY });
}

const start = useMutation({
  mutationFn: () => services.legalDocuments.startDraft(props.document),
  onSuccess: async () => {
    picked.value = undefined;
    await refreshVersions();
  },
  onError: (err) => toast.add({ title: describeDraftError(err), color: 'error' }),
});

/** Saves the texts as they were when sent. */
const save = useMutation({
  mutationFn: (sent: DraftForm) =>
    services.legalDocuments.saveDraft(props.document, toRequest(sent)),
  onSuccess: (_saved, sent) => {
    changes.markSaved(sent);
    void refreshVersions();
    toast.add({ title: 'Koncept uložen', color: 'success' });
  },
  onError: draftFailed,
});

const discard = useMutation({
  mutationFn: () => services.legalDocuments.deleteDraft(props.document),
  onSuccess: async () => {
    Object.assign(form, EMPTY_FORM);
    changes.markSaved();
    await refreshVersions();
    toast.add({ title: 'Koncept zahozen', color: 'success' });
  },
  onError: draftFailed,
});

/** Why a draft route failed: the API's own Czech reason (a text it refuses, a draft gone). */
function describeDraftError(err: unknown): string {
  const explained =
    err instanceof ApiError &&
    !err.issues?.length &&
    EXPLAINED_STATUSES.includes(err.status) &&
    err.detail;
  return explained || describeError(err);
}

/** Says why; a draft that is gone (dropped or published elsewhere) leaves the form with it. */
function draftFailed(err: unknown) {
  toast.add({ title: describeDraftError(err), color: 'error' });
  if (err instanceof ApiError && err.status === NOT_FOUND) {
    Object.assign(form, EMPTY_FORM);
    changes.markSaved();
  }
  void refreshVersions();
}

/** Saves what is unsaved, then publishes the draft if it still holds what the admin sees. */
async function saveAndPublish(): Promise<PublishedLegalVersion> {
  const seen = { ...form };
  if (changes.dirty.value) {
    await services.legalDocuments.saveDraft(props.document, toRequest(seen));
    changes.markSaved(seen);
  }
  return services.legalDocuments.publishDraft(props.document, toRequest(seen));
}

function openPublish() {
  now.value = new Date();
  publishOpen.value = true;
}

const publishOpen = ref(false);
const publish = useMutation({
  mutationFn: saveAndPublish,
  onSuccess: async (published) => {
    publishOpen.value = false;
    Object.assign(form, EMPTY_FORM);
    changes.markSaved();
    picked.value = undefined;
    await refreshVersions();
    toast.add({
      title: `Zveřejněno, platí od ${formatCzechDate(published.effectiveFrom)}`,
      color: 'success',
    });
  },
  onError: (err) => {
    publishOpen.value = false;
    draftFailed(err);
  },
});

function submit() {
  save.mutate({ ...form });
}
</script>

<template>
  <PageHeader :title="labels.name" :back="{ name: 'legal-documents' }" />

  <UAlert v-if="isError" title="Právní texty se nepodařilo načíst." color="error" variant="soft" />
  <div v-else-if="isPending" class="grid max-w-6xl gap-4 lg:grid-cols-2" aria-busy="true">
    <USkeleton class="h-96" />
    <USkeleton class="h-96" />
  </div>
  <div v-else class="grid max-w-6xl items-start gap-4 lg:grid-cols-2">
    <div class="space-y-4">
      <UForm
        v-if="draft"
        :schema="schema"
        :state="form"
        :validate-on="VALIDATE_ON"
        class="space-y-4"
        @submit="submit"
      >
        <UCard>
          <template #header>
            <h2 class="font-semibold">Koncept nové verze</h2>
            <p class="text-xs text-muted">
              Zákazníci ho neuvidí, dokud ho nezveřejníte. Zveřejněný bude platit od
              {{ formatCzechDate(draftEffectiveFrom) }}.
            </p>
          </template>
          <UTabs v-model="language" :items="LANGUAGES" :content="false" class="mb-4" size="sm" />
          <UFormField
            v-if="language === 'cs'"
            label="Text"
            name="body_cs"
            required
            help="Prázdný řádek odděluje odstavce."
          >
            <UTextarea
              v-model="form.body_cs"
              :rows="18"
              :maxrows="30"
              autoresize
              class="w-full font-mono"
            />
          </UFormField>
          <UFormField
            v-else
            label="Text v angličtině"
            name="body_en"
            help="Nepovinný. Dokud je prázdný, anglická stránka ukazuje český text s poznámkou."
          >
            <UTextarea
              v-model="form.body_en"
              :rows="18"
              :maxrows="30"
              autoresize
              class="w-full font-mono"
            />
          </UFormField>
          <UAlert
            v-if="problems.length"
            title="Takhle koncept zveřejnit nejde"
            color="warning"
            variant="soft"
            class="mt-4"
          >
            <template #description>
              <ul class="list-disc pl-4">
                <li v-for="problem in problems" :key="problem">{{ problem }}</li>
              </ul>
            </template>
          </UAlert>
          <div class="mt-4 flex flex-wrap items-center gap-2">
            <UButton
              icon="i-lucide-send"
              label="Zveřejnit"
              :disabled="problems.length > 0 || save.isPending.value || discard.isPending.value"
              :loading="publish.isPending.value"
              @click="openPublish"
            />
            <ConfirmDelete
              question="Zahodit koncept?"
              detail="Rozepsané změny se smažou. Zveřejněné verze zůstanou, jak jsou."
              :loading="discard.isPending.value"
              @confirm="discard.mutate()"
            />
          </div>
        </UCard>

        <UCard>
          <template #header><h2 class="font-semibold">Jak psát text</h2></template>
          <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt><code>## Nadpis</code></dt>
            <dd class="text-muted">
              nadpis oddílu; <code>{#reklamace}</code> na konci mu dá odkaz
            </dd>
            <dt><code>### Podnadpis</code></dt>
            <dd class="text-muted">menší nadpis</dd>
            <dt><code>- položka</code></dt>
            <dd class="text-muted">odrážka (každá na svém řádku)</dd>
            <dt><code>1. položka</code></dt>
            <dd class="text-muted">číslovaný seznam</dd>
            <dt><code>&gt; poznámka</code></dt>
            <dd class="text-muted">zvýrazněná poznámka</dd>
            <dt><code>**tučně**</code></dt>
            <dd class="text-muted">tučné písmo</dd>
            <dt><code>[text](/adresa)</code></dt>
            <dd class="text-muted">odkaz</dd>
          </dl>
        </UCard>

        <UCard>
          <template #header><h2 class="font-semibold">Značky</h2></template>
          <p class="mb-3 text-sm text-muted">
            E-shop je nahradí údaji, které platí ve chvíli zveřejnění; verze si je ponechá.
          </p>
          <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <template v-for="name in LEGAL_PLACEHOLDERS" :key="name">
              <dt><code v-text="token(name)" /></dt>
              <dd class="text-muted">{{ LEGAL_PLACEHOLDER_LABELS[name] }}</dd>
            </template>
          </dl>
        </UCard>

        <SaveBar
          :dirty="changes.dirty.value"
          :saving="save.isPending.value"
          :cancel-to="{ name: 'legal-documents' }"
        />
      </UForm>

      <UCard v-else>
        <p class="mb-4 text-sm text-muted">
          {{ labels.about }} Chcete-li text změnit, založte novou verzi: začne jako kopie té, která
          platí, a zákazníci ji uvidí až po zveřejnění.
        </p>
        <UButton
          icon="i-lucide-file-plus"
          label="Nová verze"
          :loading="start.isPending.value"
          @click="start.mutate()"
        />
      </UCard>

      <UCard>
        <template #header><h2 class="font-semibold">Zveřejněné verze</h2></template>
        <p v-if="!rows.published.length" class="text-sm text-muted">Zatím žádná.</p>
        <ul v-else class="-my-1 divide-y divide-default">
          <li
            v-for="(row, index) in rows.published"
            :key="row.id"
            class="flex items-center gap-2 py-1.5"
          >
            <span class="mr-auto text-sm">
              Od {{ versionDay(row) }}
              <span v-if="versionSuffix(row)" class="text-muted">({{ row.version }})</span>
            </span>
            <UBadge v-if="index === 0" label="Platí" color="success" variant="subtle" />
            <UButton
              :label="shownVersion === row.version ? 'V náhledu' : 'Zobrazit'"
              size="sm"
              color="neutral"
              variant="ghost"
              :disabled="shownVersion === row.version"
              @click="picked = row.version ?? undefined"
            />
          </li>
        </ul>
      </UCard>
    </div>

    <UCard class="lg:sticky lg:top-4">
      <template #header>
        <div class="flex flex-wrap items-center gap-2">
          <div class="mr-auto">
            <h2 class="font-semibold">Náhled</h2>
            <p class="text-xs text-muted">
              <template v-if="shownVersion === undefined">
                Koncept, jak bude vypadat na webu po zveřejnění.
              </template>
              <template v-else-if="shownVersion === current?.version">Verze, která platí.</template>
              <template v-else>Starší verze, jak ji zákazníci tehdy viděli.</template>
            </p>
          </div>
          <UButton
            v-if="draft && shownVersion !== undefined"
            label="Zpět na koncept"
            size="sm"
            color="neutral"
            variant="soft"
            @click="picked = undefined"
          />
        </div>
      </template>
      <UTabs v-model="language" :items="LANGUAGES" :content="false" class="mb-4" size="sm" />
      <UAlert
        v-if="czechOnly"
        title="Anglický text chybí, anglická stránka ukazuje český."
        color="neutral"
        variant="soft"
        class="mb-4"
      />
      <LegalPreview v-if="previewSource !== undefined" :source="previewSource" />
      <USkeleton v-else-if="shownVersion !== undefined" class="h-96 w-full" />
      <p v-else class="text-sm text-muted">Zatím žádný text.</p>
    </UCard>
  </div>

  <UModal
    v-model:open="publishOpen"
    title="Zveřejnit novou verzi?"
    description="Zákazníci od teď souhlasí s touto verzí. Zveřejněnou verzi už nejde změnit, jen nahradit další."
  >
    <template #body>
      <p class="text-sm">
        Nová verze bude platit od <strong>{{ formatCzechDate(draftEffectiveFrom) }}</strong
        >. Údaje prodávajícího se v ní uloží tak, jak jsou teď.
      </p>
      <UAlert
        v-if="!seller?.complete"
        title="Údaje prodávajícího nejsou označené jako úplné."
        description="Stránka této verze bude uvádět, že jde o návrh. Doplňte je v Nastavení → Prodávající."
        color="warning"
        variant="soft"
        class="mt-4"
      />
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton label="Zrušit" color="neutral" variant="ghost" @click="publishOpen = false" />
        <UButton
          label="Zveřejnit"
          icon="i-lucide-send"
          :loading="publish.isPending.value"
          @click="publish.mutate()"
        />
      </div>
    </template>
  </UModal>
</template>
