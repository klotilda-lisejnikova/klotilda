<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { useToast } from '@nuxt/ui/composables';
import { useMutation, useQueryClient } from '@tanstack/vue-query';
import {
  EMAIL_TEMPLATES,
  emailTemplateFields,
  hasBrokenPlaceholder,
  unknownPlaceholders,
} from '@klotilda/domain';
import type { EmailPreview, EmailTemplate, EmailTemplateKey, EmailText } from '@klotilda/domain';
import PageHeader from '@/components/PageHeader.vue';
import SaveBar from '@/components/SaveBar.vue';
import { services } from '@/app/api';
import { EMAIL_TEMPLATES_QUERY_KEY, useEmailTemplates } from '@/app/email-templates';
import { describeError } from '@/app/errors';
import { pick } from '@/app/form-values';
import { EMAIL_PLACEHOLDER_LABELS, EMAIL_TEMPLATE_LABELS } from '@/app/labels';
import { useUnsavedChanges } from '@/app/unsaved-changes';
import { formSchema, VALIDATE_ON } from '@/app/validation';

const props = defineProps<{ templateKey: EmailTemplateKey }>();

interface TemplateForm extends EmailText {
  enabled: boolean;
}

/** How long the preview waits for typing to pause before it asks the API. */
const PREVIEW_DELAY_MS = 400;
const TEXT_FIELDS = ['subject', 'heading', 'body'] as const;

const toast = useToast();
const queryClient = useQueryClient();
const { byKey, isError, isPending } = useEmailTemplates();
const template = computed<EmailTemplate | undefined>(() => byKey.value.get(props.templateKey));
const definition = computed(() => EMAIL_TEMPLATES[props.templateKey]);
const labels = computed(() => EMAIL_TEMPLATE_LABELS[props.templateKey]);

const form = reactive<TemplateForm>({ subject: '', heading: '', body: '', enabled: true });
const changes = useUnsavedChanges(form);

/** The key is fixed per row, so the form checks only what the admin may change. */
const { key: _key, ...checkedFields } = emailTemplateFields;
const schema = formSchema(checkedFields, 'patch');

/** A template as the form edits it. */
function toForm(loaded: EmailTemplate): TemplateForm {
  return {
    subject: loaded.subject,
    heading: loaded.heading,
    body: loaded.body ?? '',
    enabled: loaded.enabled ?? true,
  };
}

watch(
  template,
  (loaded) => {
    if (loaded) changes.load(toForm(loaded));
  },
  { immediate: true }
);

/** How a placeholder is written in the text (`{{vs}}`). */
const token = (name: string) => `{{${name}}}`;

/** What is wrong with a field's placeholders: the customer would see them as written. */
function placeholderError(text: string): string | undefined {
  const unknown = unknownPlaceholders(text, definition.value.placeholders);
  if (unknown.length) return `Neznámá značka ${unknown.map(token).join(', ')}`;
  if (hasBrokenPlaceholder(text)) return 'Značka se píše celá ve dvojitých závorkách, např. {{vs}}';
  return undefined;
}

const placeholderErrors = computed(
  () =>
    Object.fromEntries(
      TEXT_FIELDS.map((field) => [field, placeholderError(form[field])])
    ) as Record<(typeof TEXT_FIELDS)[number], string | undefined>
);
const hasPlaceholderErrors = computed(() => Object.values(placeholderErrors.value).some(Boolean));

function restoreDefaults() {
  const { subject, heading, body } = definition.value;
  Object.assign(form, { subject, heading, body });
}

const isDefault = computed(() =>
  TEXT_FIELDS.every((field) => form[field] === definition.value[field])
);

/** Saves what changed, as it was when sent. */
const save = useMutation({
  mutationFn: (sent: TemplateForm) =>
    services.emailTemplates.update(template.value!.id, pick(sent, changes.changed.value)),
  onSuccess: (_saved, sent) => {
    changes.markSaved(sent);
    void queryClient.invalidateQueries({ queryKey: EMAIL_TEMPLATES_QUERY_KEY });
    toast.add({ title: 'Uloženo', color: 'success' });
  },
  onError: (err) => toast.add({ title: describeError(err), color: 'error' }),
});

function submit() {
  if (hasPlaceholderErrors.value) {
    toast.add({ title: 'Opravte neznámé značky, jinak by je zákazník viděl.', color: 'error' });
    return;
  }
  save.mutate({ ...form });
}

// ── The preview: the API renders the text around a sample order ────
const preview = ref<EmailPreview>();
/** Why the last preview failed, if it did. */
const previewError = ref<string>();
let previewTimer: ReturnType<typeof setTimeout> | undefined;
/** Only the answer to the latest request is shown; an older one arriving late is dropped. */
let previewRequest = 0;

async function loadPreview() {
  const request = ++previewRequest;
  const { subject, heading, body } = form;
  try {
    const answer = await services.emailTemplates.preview({
      key: props.templateKey,
      subject,
      heading,
      body,
    });
    if (request !== previewRequest) return;
    preview.value = answer;
    previewError.value = undefined;
  } catch (err) {
    if (request === previewRequest) previewError.value = describeError(err);
  }
}

watch(
  () => [form.subject, form.heading, form.body, props.templateKey],
  () => {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => void loadPreview(), PREVIEW_DELAY_MS);
  },
  { immediate: true }
);
onBeforeUnmount(() => clearTimeout(previewTimer));
</script>

<template>
  <PageHeader :title="labels.name" :back="{ name: 'email-templates' }" />

  <UAlert v-if="isError" title="E-mail se nepodařilo načíst." color="error" variant="soft" />
  <UAlert
    v-else-if="!isPending && !template"
    title="Tento e-mail v databázi chybí."
    description="E-shop ho posílá s výchozím textem. Upravit ho půjde, až se doplní migrací."
    color="warning"
    variant="soft"
  />
  <div v-else-if="!template" class="grid max-w-6xl gap-4 lg:grid-cols-2" aria-busy="true">
    <USkeleton class="h-96" />
    <USkeleton class="h-96" />
  </div>
  <div v-else class="grid max-w-6xl items-start gap-4 lg:grid-cols-2">
    <UForm
      :schema="schema"
      :state="form"
      :validate-on="VALIDATE_ON"
      class="space-y-4"
      @submit="submit"
    >
      <UCard>
        <p class="mb-4 text-sm text-muted">
          {{ labels.when }}
          {{ definition.to === 'artist' ? 'Chodí na vaši adresu.' : '' }}
        </p>
        <div class="space-y-4">
          <UFormField label="Předmět" name="subject" required :error="placeholderErrors.subject">
            <UInput v-model="form.subject" class="w-full" />
          </UFormField>
          <UFormField label="Nadpis" name="heading" required :error="placeholderErrors.heading">
            <UInput v-model="form.heading" class="w-full" />
          </UFormField>
          <UFormField
            label="Text"
            name="body"
            help="Prázdný řádek začne nový odstavec. Za text e-shop doplní údaje z objednávky."
            :error="placeholderErrors.body"
          >
            <UTextarea v-model="form.body" :rows="6" autoresize class="w-full" />
          </UFormField>
        </div>
        <USwitch
          v-if="!definition.required"
          v-model="form.enabled"
          label="Posílat"
          description="Vypnutý e-mail e-shop neposílá."
          class="mt-4"
        />
        <p v-else class="mt-4 text-sm text-muted">
          Tento e-mail se posílá vždy: zákazník musí dostat potvrzení objednávky.
        </p>
        <UButton
          class="mt-4"
          icon="i-lucide-rotate-ccw"
          label="Obnovit výchozí text"
          color="neutral"
          variant="soft"
          :disabled="isDefault"
          @click="restoreDefaults"
        />
      </UCard>

      <UCard>
        <template #header><h2 class="font-semibold">Značky</h2></template>
        <p class="mb-3 text-sm text-muted">
          Do předmětu, nadpisu i textu můžete vložit značku, e-shop ji nahradí údajem z objednávky.
        </p>
        <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <template v-for="name in definition.placeholders" :key="name">
            <dt><code v-text="token(name)" /></dt>
            <dd class="text-muted">{{ EMAIL_PLACEHOLDER_LABELS[name] }}</dd>
          </template>
        </dl>
      </UCard>

      <SaveBar
        :dirty="changes.dirty.value"
        :saving="save.isPending.value"
        :cancel-to="{ name: 'email-templates' }"
      />
    </UForm>

    <UCard class="lg:sticky lg:top-4">
      <template #header>
        <h2 class="font-semibold">Náhled</h2>
        <p class="text-xs text-muted">S ukázkovou objednávkou, tak jak e-mail odejde.</p>
      </template>
      <UAlert
        v-if="previewError"
        :title="`Náhled se nepodařilo připravit: ${previewError}`"
        color="warning"
        variant="soft"
        class="mb-3"
      />
      <template v-if="preview">
        <p class="mb-3 text-sm">
          <span class="text-muted">Předmět:</span>
          <span class="font-medium text-highlighted">{{ preview.subject }}</span>
        </p>
        <!-- The API's HTML, isolated: no scripts, no access to the admin. -->
        <iframe
          :srcdoc="preview.html"
          sandbox=""
          title="Náhled e-mailu"
          class="h-[36rem] w-full rounded-md bg-white ring ring-default"
        />
      </template>
      <USkeleton v-else-if="!previewError" class="h-[36rem] w-full" />
    </UCard>
  </div>
</template>
