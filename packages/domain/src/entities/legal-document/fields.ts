import type { Fields } from '@eleansphere/entity-core';
import { LEGAL_DOCUMENT_STATUSES, LEGAL_DOCUMENTS } from './keys';

/** Long enough for `YYYY-MM-DD-N`, and the order's `termsVersion`. */
export const LEGAL_VERSION_MAX_LENGTH = 20;
const BODY_MAX_LENGTH = 100_000;

/**
 * One version of a legal page. Every field but the texts is set by the API's own routes
 * (`src/legal/`); a published version changes no more.
 */
export const legalDocumentVersionFields = {
  /** Which page (`LEGAL_DOCUMENTS`). */
  document: { type: 'ENUM', values: LEGAL_DOCUMENTS, required: true, readOnly: true },
  /** The Prague date it was published (`2026-11-02`, a second one that day `2026-11-02-2`); none for the draft. */
  version: { type: 'STRING', maxLength: LEGAL_VERSION_MAX_LENGTH, readOnly: true },
  /** The text: the Markdown subset of `parseLegalText`, with `LEGAL_PLACEHOLDERS`. */
  body_cs: { type: 'TEXT', required: true, maxLength: BODY_MAX_LENGTH },
  /** The English page's text; while empty, that page shows the Czech one. */
  body_en: { type: 'TEXT', maxLength: BODY_MAX_LENGTH },
  status: {
    type: 'ENUM',
    values: LEGAL_DOCUMENT_STATUSES,
    default: 'draft',
    readOnly: true,
  },
  publishedAt: { type: 'DATE', readOnly: true },
  /** JSON: the seller's details at publishing (`LegalSellerSnapshot`), shown with this version. */
  seller: { type: 'TEXT', readOnly: true },
} as const satisfies Fields;
