import type { Migration } from '@eleansphere/be-core';

/**
 * The website's own wording becomes rows the admin edits, one per text, starting from what the
 * translation files said. Safe to run again (an edited row is left alone), and on a schema
 * `sync()` built. Frozen: it uses nothing from the domain or the web.
 */
const CREATE_SITE_TEXTS = `CREATE TABLE IF NOT EXISTS "SiteTexts" ("id" VARCHAR(255) NOT NULL, "key" VARCHAR(255) NOT NULL UNIQUE, "text_cs" TEXT, "text_en" TEXT, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, PRIMARY KEY ("id"))`;

/** The texts of `apps/web/messages/{cs,en}.json` on 2026-11-01. */
const FIRST_TEXTS = [
  {
    key: 'home.hero.subtitle',
    text_cs: 'Keramika · Výšivka · Linoryt',
    text_en: 'Original ceramics · embroidery · linocut',
  },
  { key: 'home.about.title', text_cs: 'O mně', text_en: 'About' },
  {
    key: 'home.about.bio1',
    text_cs:
      'Ahoj, jsem Klotilda a tvořím v Praze drobné radůstky, které si můžeš koupit na těchto stránkách. Tak směle do toho!',
    text_en:
      'My name is Klotilda and I create in Prague. My work grows from a love of traditional crafts — ceramics, embroidery and linocut — which I connect with a contemporary sensibility.',
  },
  {
    key: 'home.about.bio2',
    text_cs: '',
    text_en:
      'Each piece is made by hand in my studio, without rush. I believe the objects around us can be not only beautiful but deeply personal.',
  },
  {
    key: 'home.gallery.subtitle',
    text_cs: 'Výběr z posledních prací',
    text_en: 'A selection of recent works',
  },
  { key: 'home.cta.title', text_cs: 'Originály k prodeji', text_en: 'Originals for Sale' },
  {
    key: 'home.cta.subtitle',
    text_cs: 'Každý kus je jedinečný a čeká na svého nového majitele.',
    text_en: 'Each piece is unique and waiting for its new owner.',
  },
  {
    key: 'home.contact.subtitle',
    text_cs: 'Ráda si popovídám o spolupráci nebo zakázkách.',
    text_en: "I'm happy to talk about collaborations, commissions, or just say hello.",
  },
  { key: 'home.contact.email', text_cs: 'klotilda@klotilda.cz', text_en: null },
  { key: 'home.contact.instagram', text_cs: '@klotilda.lisejnikova', text_en: null },
  {
    key: 'metadata.description',
    text_cs:
      'Ručně vyráběná keramika, výšivky a linoryty od české umělkyně. Každý kus je originál.',
    text_en:
      'Handmade ceramics, embroidery, and linocut prints by a Czech artist. Each piece is one of a kind.',
  },
];

/** Ids like the API's own: the model prefix and 32 hex characters. */
const INSERT_TEXT = `INSERT INTO "SiteTexts" ("id", "key", "text_cs", "text_en", "createdAt", "updatedAt")
  VALUES ('stx' || md5(random()::text || clock_timestamp()::text), $key, $text_cs, $text_en, now(), now())
  ON CONFLICT ("key") DO NOTHING`;

export const siteTexts: Migration = {
  name: '2026-11-01-site-texts',
  async up({ sequelize }) {
    await sequelize.query(CREATE_SITE_TEXTS);
    for (const text of FIRST_TEXTS) {
      await sequelize.query(INSERT_TEXT, { bind: text });
    }
  },
};
