/** The website's legal pages, each versioned on its own. */
export const LEGAL_DOCUMENTS = ['terms', 'privacy', 'withdrawal'] as const;
export type LegalDocumentKey = (typeof LEGAL_DOCUMENTS)[number];

export const LEGAL_DOCUMENT_STATUSES = ['draft', 'published'] as const;
export type LegalDocumentStatus = (typeof LEGAL_DOCUMENT_STATUSES)[number];

/** Whether `value` names one of the legal pages (a URL's segment must). */
export const isLegalDocumentKey = (value: string): value is LegalDocumentKey =>
  (LEGAL_DOCUMENTS as readonly string[]).includes(value);

/** What the legal texts may name as `{{…}}`: the seller, the version's date and the pages' paths. */
export const LEGAL_PLACEHOLDERS = [
  'sellerName',
  'sellerIco',
  'sellerAddress',
  'sellerEmail',
  'sellerPhone',
  'sellerRegistration',
  'effectiveFrom',
  'termsPath',
  'privacyPath',
  'withdrawalPath',
  'complaintsAnchor',
] as const;
export type LegalPlaceholder = (typeof LEGAL_PLACEHOLDERS)[number];
