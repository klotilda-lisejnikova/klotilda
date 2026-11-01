import type { Migration } from '@eleansphere/be-core';

/**
 * Customers' reviews of their orders, one per order, and the two e-mails about them: the
 * invitation with the delivered order and the artist's notice of a new review. Safe to run again
 * (an edited e-mail is left alone), and on a schema `sync()` built. Frozen: it uses nothing from
 * the domain, whose defaults may change later.
 */
const CREATE_REVIEWS = `CREATE TABLE IF NOT EXISTS "Reviews" ("id" VARCHAR(255) NOT NULL, "orderId" VARCHAR(255) NOT NULL UNIQUE REFERENCES "Orders" ("id") ON DELETE NO ACTION ON UPDATE CASCADE, "rating" INTEGER NOT NULL, "body" TEXT NOT NULL, "authorName" VARCHAR(255) NOT NULL, "locale" VARCHAR(255) NOT NULL, "items" TEXT NOT NULL, "status" VARCHAR(255) DEFAULT 'pending', "hiddenReason" TEXT, "reply" TEXT, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, PRIMARY KEY ("id"))`;

const NEW_TEMPLATES = [
  {
    key: 'mark-delivered',
    subject: 'Objednávka {{vs}} — jak jste spokojeni?',
    heading: 'Děkujeme za nákup',
    body: 'Dobrý den, objednávka {{vs}} je u vás. Budeme rádi, když nám napíšete, jak se vám líbí — vaše recenze pomůže dalším zákazníkům.',
  },
  {
    key: 'new-review',
    subject: 'Nová recenze k objednávce {{vs}}',
    heading: 'Nová recenze',
    body: 'Recenze čeká na schválení v adminu, v části Recenze.',
  },
];

/** Ids like the API's own: the model prefix and 32 hex characters. */
const INSERT_TEMPLATE = `INSERT INTO "EmailTemplates" ("id", "key", "enabled", "subject", "heading", "body", "createdAt", "updatedAt")
  VALUES ('eml' || md5(random()::text || clock_timestamp()::text), $key, true, $subject, $heading, $body, now(), now())
  ON CONFLICT ("key") DO NOTHING`;

export const reviews: Migration = {
  name: '2026-11-01-reviews',
  async up({ sequelize }) {
    await sequelize.query(CREATE_REVIEWS);
    for (const template of NEW_TEMPLATES) {
      await sequelize.query(INSERT_TEMPLATE, { bind: template });
    }
  },
};
