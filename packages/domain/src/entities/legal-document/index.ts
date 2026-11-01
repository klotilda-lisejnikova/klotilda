import { defineEntity } from '@eleansphere/entity-core';
import { COMPLAINTS_ANCHOR, LEGAL_PATHS } from '../../seller';
import { parseLegalText } from '../../legal-text';
import { hasBrokenPlaceholder, unknownPlaceholders, fillPlaceholders } from '../../placeholders';
import type { Seller } from '../seller';
import { legalDocumentVersionFields } from './fields';
import { LEGAL_PLACEHOLDERS } from './keys';
import type { LegalDocumentKey, LegalPlaceholder } from './keys';

export * from './keys';

export const LEGAL_DOCUMENTS_PATH = '/api/legal-documents';

/**
 * The versions of the legal pages. Auto CRUD only reads them, signed in (the admin's list and the
 * draft); everything else goes through `src/legal/` in the API: the public current and archived
 * versions, and the draft's routes.
 */
export const legalDocumentVersionEntity = defineEntity({
  name: 'LegalDocumentVersion',
  prefix: 'leg',
  basePath: LEGAL_DOCUMENTS_PATH,
  access: { read: 'auth', write: 'auth' },
  fields: legalDocumentVersionFields,
  query: {
    filter: { document: 'eq', status: 'eq' },
    sort: ['publishedAt', 'createdAt'],
    defaultSort: '-createdAt',
    defaultLimit: 50,
    maxLimit: 100,
  },
  extend: (Base) =>
    class extends Base {
      /** The document's version in force (public). */
      current(document: LegalDocumentKey) {
        return this.get<PublishedLegalVersion>(legalCurrentRoute(document));
      }

      /** Every published version of the document, newest first (public). */
      published(document: LegalDocumentKey) {
        return this.get<LegalVersionSummary[]>(legalVersionsRoute(document));
      }

      /** One published version, as it was published (public). */
      version(document: LegalDocumentKey, version: string) {
        return this.get<PublishedLegalVersion>(legalVersionsRoute(document, version));
      }
    },
});

export type LegalDocumentVersion = InstanceType<typeof legalDocumentVersionEntity.Dto>;

/** The seller's details a version was published with (the `Seller` row's, at that moment). */
export interface LegalSellerSnapshot extends Pick<Seller, 'name' | 'ico' | 'address' | 'email'> {
  phone: string | null;
  registration: string | null;
  /** Whether the admin had marked the details complete; the page of a version without says draft. */
  complete?: boolean;
}

/** A published version as the website shows it. */
export interface PublishedLegalVersion {
  document: LegalDocumentKey;
  version: string;
  /** The Prague date it applies from (`2026-11-02`). */
  effectiveFrom: string;
  body_cs: string;
  body_en: string | null;
  seller: LegalSellerSnapshot;
}

/** `GET …/:document/versions`: every published version, newest first. */
export interface LegalVersionSummary {
  version: string;
  effectiveFrom: string;
}

/** The draft's texts, as the admin edits them. */
export interface LegalDraftRequest {
  body_cs: string;
  body_en?: string | null;
}

/** `GET` the document's current version (public). */
export const legalCurrentRoute = (document: LegalDocumentKey) =>
  `${LEGAL_DOCUMENTS_PATH}/${document}/current`;
/** `GET` the list of published versions, or one of them (public). */
export const legalVersionsRoute = (document: LegalDocumentKey, version?: string) =>
  `${LEGAL_DOCUMENTS_PATH}/${document}/versions${version ? `/${encodeURIComponent(version)}` : ''}`;
/** The website's page of one version (`/obchodni-podminky/2026-11-02`). */
export const legalVersionPath = (document: LegalDocumentKey, version: string) =>
  `${LEGAL_PATHS[document]}/${encodeURIComponent(version)}`;
/** `POST` (start one), `PUT` (save the texts), `DELETE` the draft; signed in. */
export const legalDraftRoute = (document: LegalDocumentKey) =>
  `${LEGAL_DOCUMENTS_PATH}/${document}/draft`;
/** `POST`: the draft becomes the current version; signed in. Can't be undone. */
export const legalPublishRoute = (document: LegalDocumentKey) =>
  `${legalDraftRoute(document)}/publish`;

/** What other pages link to inside a document, which every version of it must keep. */
export const LEGAL_REQUIRED_ANCHORS: Record<LegalDocumentKey, readonly string[]> = {
  terms: [COMPLAINTS_ANCHOR],
  privacy: [],
  withdrawal: [],
};

/** "2. 11. 2026" for `2026-11-02`, as the pages and e-mails show a date. */
export function formatCzechDate(isoDate: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split('-').map(Number);
  return `${day}. ${month}. ${year}`;
}

/** What each `{{…}}` of a legal text stands for, in one version. */
export function legalPlaceholderValues(
  seller: LegalSellerSnapshot,
  effectiveFrom: string
): Record<LegalPlaceholder, string> {
  return {
    sellerName: seller.name,
    sellerIco: seller.ico,
    sellerAddress: seller.address,
    sellerEmail: seller.email,
    sellerPhone: seller.phone ?? '',
    sellerRegistration: seller.registration ?? '',
    effectiveFrom: formatCzechDate(effectiveFrom),
    termsPath: LEGAL_PATHS.terms,
    privacyPath: LEGAL_PATHS.privacy,
    withdrawalPath: LEGAL_PATHS.withdrawal,
    complaintsAnchor: COMPLAINTS_ANCHOR,
  };
}

/** A version's text with its placeholders filled; an unknown one stays as written. */
export function fillLegalText(
  text: string,
  seller: LegalSellerSnapshot,
  effectiveFrom: string
): string {
  return fillPlaceholders(text, legalPlaceholderValues(seller, effectiveFrom));
}

/** What would be wrong with publishing `text` as `document`, in Czech for the admin; empty if nothing. */
export function legalTextProblems(document: LegalDocumentKey, text: string): string[] {
  if (text.trim() === '') return ['Text je prázdný.'];
  const problems: string[] = [];
  const unknown = unknownPlaceholders(text, LEGAL_PLACEHOLDERS);
  if (unknown.length) {
    problems.push(`Neznámá značka ${unknown.map((name) => `{{${name}}}`).join(', ')}`);
  }
  if (hasBrokenPlaceholder(text)) problems.push('Značka se píše celá ve dvojitých závorkách.');
  const filled = fillPlaceholders(text, { complaintsAnchor: COMPLAINTS_ANCHOR });
  const anchors = new Set(
    parseLegalText(filled).flatMap((block) =>
      block.kind === 'heading' && block.id ? [block.id] : []
    )
  );
  for (const anchor of LEGAL_REQUIRED_ANCHORS[document]) {
    if (!anchors.has(anchor)) {
      problems.push(`Chybí nadpis s odkazem {#${anchor}}, na který odkazují jiné stránky.`);
    }
  }
  return problems;
}

const PRAGUE_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Prague',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** The date in Prague at `now` (`2026-11-02`), whatever the server's own zone. */
export function pragueDate(now: Date): string {
  return PRAGUE_DATE.format(now);
}

/**
 * How a version is named: the date it applies from, `-2`, `-3`… for a second one that day. No dot,
 * so the website's middleware, which leaves paths with a dot (files) alone, routes its page.
 */
const LEGAL_VERSION = /^\d{4}-\d{2}-\d{2}(-[2-9]|-[1-9]\d+)?$/;

/** Whether `value` can name a version (a URL's segment must). */
export const isLegalVersion = (value: string) => LEGAL_VERSION.test(value);

/** The date part of a version (`2026-11-02` of `2026-11-02-2`): the day it applies from. */
export const legalVersionDate = (version: string) => version.slice(0, 10);

/**
 * The version a draft published on `date` gets: the date, or `date-2`… when that day has one.
 * Its date is never earlier than one already taken (the first versions were dated a day ahead),
 * so the version published last, the current one, also names the latest day.
 */
export function nextLegalVersion(date: string, taken: readonly string[]): string {
  const latest = taken.map(legalVersionDate).reduce((max, day) => (day > max ? day : max), date);
  if (!taken.includes(latest)) return latest;
  let suffix = 2;
  while (taken.includes(`${latest}-${suffix}`)) suffix++;
  return `${latest}-${suffix}`;
}
