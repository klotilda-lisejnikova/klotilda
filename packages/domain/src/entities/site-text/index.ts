import { defineEntity } from '@eleansphere/entity-core';
import { siteTextFields } from './fields';
import { UNTRANSLATED_SITE_TEXTS } from './keys';

export * from './keys';

export const SITE_TEXTS_PATH = '/api/site-texts';

/**
 * The website's own wording (the home page, the contact details, the page description), one row
 * per `SITE_TEXT_KEYS`. Anyone reads them, the admin edits them; rows are never created or deleted
 * through the API.
 */
export const siteTextEntity = defineEntity({
  name: 'SiteText',
  prefix: 'stx',
  basePath: SITE_TEXTS_PATH,
  access: { read: 'public', write: 'auth' },
  fields: siteTextFields,
  query: { sort: ['createdAt'], defaultSort: 'createdAt', defaultLimit: 50, maxLimit: 50 },
});

export type SiteText = InstanceType<typeof siteTextEntity.Dto>;

/** A row as `siteTextFor` reads it; its key may name a message no longer listed. */
type SiteTextRow = Pick<SiteText, 'text_cs' | 'text_en'> & { key: string };

const isUntranslated = (key: string) =>
  (UNTRANSLATED_SITE_TEXTS as readonly string[]).includes(key);

/**
 * The text a row gives a page in `locale`: the English page falls back to the Czech one, and an
 * untranslated text (`UNTRANSLATED_SITE_TEXTS`) is the Czech one in both.
 */
export function siteTextFor(row: SiteTextRow, locale: string): string {
  if (locale === 'en' && !isUntranslated(row.key) && row.text_en?.trim()) return row.text_en;
  return row.text_cs ?? '';
}

/** What may stand before an Instagram account's name: `@`, or its profile's address. */
const INSTAGRAM_PREFIX = /^(@|https?:\/\/(www\.)?instagram\.com\/)/i;

/** `@klotilda.lisejnikova` (or its profile's address) → its Instagram profile's address. */
export function instagramUrl(handle: string): string {
  const name = handle.replace(/\s+/g, '').replace(INSTAGRAM_PREFIX, '').replace(/\/+$/, '');
  return `https://instagram.com/${encodeURIComponent(name)}`;
}

/** next-intl's messages: nested objects of strings. */
export type Messages = { [key: string]: string | Messages };

/** Sets `path` (`home.about.title`) to `text` where the files have a message, never elsewhere. */
function setMessage(messages: Messages, path: string, text: string): void {
  const parts = path.split('.');
  const last = parts.pop()!;
  let node: string | Messages | undefined = messages;
  for (const part of parts) {
    node = typeof node === 'object' ? node[part] : undefined;
  }
  if (typeof node === 'object' && typeof node[last] === 'string') node[last] = text;
}

/**
 * The text as a literal ICU message, which next-intl formats, so what the admin types shows as
 * typed: a run of `{`, `}`, `<` (with any quote touching it) is quoted, every quote doubled. `>`
 * stays bare, since next-intl returns a message without `{` or `<` unparsed.
 */
export function escapeMessage(text: string): string {
  return text.replace(/[{}<][{}<']*|'/g, (match) =>
    match === "'" ? "''" : `'${match.replace(/'/g, "''")}'`
  );
}

/** The website's translation files with the admin's texts laid over them, literal, as a copy. */
export function withSiteTexts(
  messages: Messages,
  texts: readonly SiteTextRow[],
  locale: string
): Messages {
  const result = JSON.parse(JSON.stringify(messages)) as Messages;
  for (const text of texts) setMessage(result, text.key, escapeMessage(siteTextFor(text, locale)));
  return result;
}
