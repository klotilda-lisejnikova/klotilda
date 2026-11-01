import { legalDocumentVersionEntity, legalVersionDate } from '@klotilda/domain';
import type {
  LegalDocumentKey,
  LegalSellerSnapshot,
  PublishedLegalVersion,
} from '@klotilda/domain';
import type { Sequelize } from '@eleansphere/be-core';
import type { ModelClass, ModelRegistry } from '../models-registry';

export type Transaction = Awaited<ReturnType<Sequelize['transaction']>>;
type Row = NonNullable<Awaited<ReturnType<ModelClass['findOne']>>>;

/** Newest first: the first published one is the document's current version. */
export const NEWEST_FIRST: [string, 'ASC' | 'DESC'][] = [
  ['publishedAt', 'DESC'],
  ['createdAt', 'DESC'],
  ['id', 'DESC'],
];

export const versions = (registry: ModelRegistry) =>
  registry.get(legalDocumentVersionEntity.config.name);

/** A published row as the website reads it. */
export function toPublished(row: Row): PublishedLegalVersion {
  const version = String(row.get('version'));
  const bodyEn = row.get('body_en');
  return {
    document: row.get('document') as LegalDocumentKey,
    version,
    effectiveFrom: legalVersionDate(version),
    body_cs: String(row.get('body_cs')),
    body_en: typeof bodyEn === 'string' && bodyEn !== '' ? bodyEn : null,
    seller: JSON.parse(String(row.get('seller'))) as LegalSellerSnapshot,
  };
}

/** The document's current version: its newest published one; none before the first. */
export function findCurrentVersion(
  registry: ModelRegistry,
  document: LegalDocumentKey,
  transaction?: Transaction
): Promise<Row | null> {
  return versions(registry).findOne({
    where: { document, status: 'published' },
    order: NEWEST_FIRST,
    transaction,
  });
}
