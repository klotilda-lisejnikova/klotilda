/**
 * The website's texts the admin words, one `SiteText` row each. A key is the path of the
 * next-intl message the row replaces (`apps/web/messages/*.json`), so the website lays the rows
 * over its translation files and every other string stays there.
 */
export const SITE_TEXT_KEYS = [
  'home.hero.subtitle',
  'home.about.title',
  'home.about.bio1',
  'home.about.bio2',
  'home.gallery.subtitle',
  'home.cta.title',
  'home.cta.subtitle',
  'home.contact.subtitle',
  'home.contact.email',
  'home.contact.instagram',
  'metadata.description',
] as const;
export type SiteTextKey = (typeof SITE_TEXT_KEYS)[number];

/** The texts that read the same in both languages (an address): their English text is not used. */
export const UNTRANSLATED_SITE_TEXTS: readonly SiteTextKey[] = [
  'home.contact.email',
  'home.contact.instagram',
];
