import type { Migration } from '@eleansphere/be-core';

/**
 * The automatic e-mails' wording becomes rows the admin edits, one per e-mail, starting from the
 * texts the code sent. Safe to run again (an edited row is left alone), and on a schema `sync()`
 * built. Frozen: it uses nothing from the domain, whose defaults may change later.
 */
const CREATE_EMAIL_TEMPLATES = `CREATE TABLE IF NOT EXISTS "EmailTemplates" ("id" VARCHAR(255) NOT NULL, "key" VARCHAR(255) NOT NULL UNIQUE, "enabled" BOOLEAN DEFAULT true, "subject" VARCHAR(255) NOT NULL, "heading" VARCHAR(255) NOT NULL, "body" TEXT, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, PRIMARY KEY ("id"))`;

const FIRST_TEMPLATES = [
  {
    key: 'order-received',
    subject: 'Objednávka {{vs}} — přijata',
    heading: 'Děkujeme za objednávku',
    body: 'Dobrý den, objednávku {{vs}} jsme přijali.',
  },
  {
    key: 'new-order',
    subject: 'Nová objednávka {{vs}} — {{castka}}',
    heading: 'Nová objednávka',
    body: '',
  },
  {
    key: 'mark-paid',
    subject: 'Objednávka {{vs}} — platba dorazila',
    heading: 'Platba dorazila',
    body: 'Děkujeme, platbu za objednávku {{vs}} jsme přijali.',
  },
  {
    key: 'ship',
    subject: 'Objednávka {{vs}} je na cestě',
    heading: 'Zásilka je na cestě',
    body: 'Objednávku {{vs}} jsme odeslali ({{doprava}}).',
  },
  {
    key: 'ready-for-pickup',
    subject: 'Objednávka {{vs}} je připravená k vyzvednutí',
    heading: 'Připraveno k vyzvednutí',
    body: 'Objednávka {{vs}} na vás čeká.',
  },
  {
    key: 'cancel',
    subject: 'Objednávka {{vs}} byla zrušena',
    heading: 'Objednávka zrušena',
    body: 'Objednávku {{vs}} jsme zrušili.',
  },
  {
    key: 'mark-refunded',
    subject: 'Objednávka {{vs}} — peníze jsou na cestě zpět',
    heading: 'Vrátili jsme vám peníze',
    body: 'Za zrušenou objednávku {{vs}} jsme vám vrátili {{castka}}.',
  },
];

/** Ids like the API's own: the model prefix and 32 hex characters. */
const INSERT_TEMPLATE = `INSERT INTO "EmailTemplates" ("id", "key", "enabled", "subject", "heading", "body", "createdAt", "updatedAt")
  VALUES ('eml' || md5(random()::text || clock_timestamp()::text), $key, true, $subject, $heading, $body, now(), now())
  ON CONFLICT ("key") DO NOTHING`;

export const emailTemplates: Migration = {
  name: '2026-11-01-email-templates',
  async up({ sequelize }) {
    await sequelize.query(CREATE_EMAIL_TEMPLATES);
    for (const template of FIRST_TEMPLATES) {
      await sequelize.query(INSERT_TEMPLATE, { bind: template });
    }
  },
};
