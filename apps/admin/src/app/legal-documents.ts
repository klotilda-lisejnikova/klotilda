import { computed } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import { LEGAL_DOCUMENTS, legalVersionDate, nextLegalVersion, pragueDate } from '@klotilda/domain';
import type { LegalDocumentKey, LegalDocumentVersion } from '@klotilda/domain';
import { services } from './api';
import { fetchAllPages } from './all-pages';

export const LEGAL_VERSIONS_QUERY_KEY = ['legal-documents'];

/** One document's rows: its draft, if any, and its published versions, newest (in force) first. */
export interface LegalDocumentRows {
  draft?: LegalDocumentVersion;
  published: LegalDocumentVersion[];
}

/** When a row was published, for sorting; a draft has no such moment. */
const publishedTime = (row: LegalDocumentVersion) =>
  row.publishedAt ? new Date(row.publishedAt).getTime() : 0;

/** The rows of every document, split as `LegalDocumentRows`. */
export function groupLegalVersions(
  rows: readonly LegalDocumentVersion[]
): Record<LegalDocumentKey, LegalDocumentRows> {
  const grouped = Object.fromEntries(
    LEGAL_DOCUMENTS.map((document) => [document, { published: [] }])
  ) as unknown as Record<LegalDocumentKey, LegalDocumentRows>;
  for (const row of rows) {
    const entry = grouped[row.document];
    if (row.status === 'draft') entry.draft = row;
    else entry.published.push(row);
  }
  for (const entry of Object.values(grouped)) {
    entry.published.sort((a, b) => publishedTime(b) - publishedTime(a));
  }
  return grouped;
}

/** The day a draft published now would apply from: today in Prague, or the latest day taken. */
export function nextEffectiveFrom(published: readonly LegalDocumentVersion[], now: Date): string {
  const taken = published.map((row) => String(row.version));
  return legalVersionDate(nextLegalVersion(pragueDate(now), taken));
}

/** Every legal version, drafts too, grouped by document. */
export function useLegalVersions() {
  const query = useQuery({
    queryKey: LEGAL_VERSIONS_QUERY_KEY,
    queryFn: () =>
      fetchAllPages((page, limit) =>
        services.legalDocuments.getAll({ page, limit, sort: ['createdAt'] })
      ),
  });
  const byDocument = computed(() => groupLegalVersions(query.data.value ?? []));
  return { ...query, byDocument };
}
