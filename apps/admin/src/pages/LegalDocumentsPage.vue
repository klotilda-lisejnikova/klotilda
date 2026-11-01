<script setup lang="ts">
import { formatCzechDate, LEGAL_DOCUMENTS, legalVersionDate } from '@klotilda/domain';
import PageHeader from '@/components/PageHeader.vue';
import { LEGAL_DOCUMENT_LABELS } from '@/app/labels';
import { useLegalVersions } from '@/app/legal-documents';

const { byDocument, isPending, isError } = useLegalVersions();
</script>

<template>
  <PageHeader title="Právní texty" />

  <p class="mb-4 max-w-2xl text-sm text-muted">
    Texty právních stránek webu. Každá změna je nová verze: rozpracujete koncept, a až ho
    zveřejníte, platí od toho dne. Zveřejněná verze se už nemění, takže u každé objednávky zůstane
    dohledatelné, s čím zákazník souhlasil.
  </p>

  <UAlert v-if="isError" title="Právní texty se nepodařilo načíst." color="error" variant="soft" />
  <div v-else-if="isPending" class="max-w-3xl space-y-2">
    <USkeleton v-for="line in 3" :key="line" class="h-16 w-full" />
  </div>
  <ul
    v-else
    class="max-w-3xl divide-y divide-default overflow-hidden rounded-lg bg-default ring ring-default"
  >
    <li
      v-for="document in LEGAL_DOCUMENTS"
      :key="document"
      class="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
    >
      <div class="mr-auto min-w-0">
        <p class="font-medium text-highlighted">{{ LEGAL_DOCUMENT_LABELS[document].name }}</p>
        <p class="text-xs text-muted">
          <template v-if="byDocument[document].published[0]">
            Platí verze od
            {{
              formatCzechDate(legalVersionDate(String(byDocument[document].published[0].version)))
            }}
          </template>
          <template v-else>Zatím žádná zveřejněná verze</template>
        </p>
      </div>
      <div class="flex items-center gap-2">
        <UBadge
          v-if="byDocument[document].draft"
          label="Rozpracovaný koncept"
          color="warning"
          variant="subtle"
        />
        <UButton
          icon="i-lucide-pencil"
          label="Otevřít"
          color="neutral"
          variant="soft"
          :to="{ name: 'legal-document', params: { document } }"
        />
      </div>
    </li>
  </ul>
</template>
