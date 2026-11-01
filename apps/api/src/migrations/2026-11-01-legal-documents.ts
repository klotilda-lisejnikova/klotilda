import type { Migration } from '@eleansphere/be-core';
import {
  PRIVACY_CS,
  PRIVACY_EN,
  TERMS_CS,
  TERMS_EN,
  WITHDRAWAL_CS,
  WITHDRAWAL_EN,
} from './2026-11-01-legal-texts';

/**
 * The legal pages become versions the admin publishes: version 2026-11-02 of each (the terms the
 * checkout already stores on orders) with the texts the website showed, published now, with the
 * seller's details of the `Sellers` row. Safe to run again (a document that has a version is left
 * alone), and on a schema `sync()` built. Frozen: it uses nothing from the domain.
 */
const CREATE_LEGAL_DOCUMENT_VERSIONS = `CREATE TABLE IF NOT EXISTS "LegalDocumentVersions" ("id" VARCHAR(255) NOT NULL, "document" VARCHAR(255) NOT NULL, "version" VARCHAR(255), "body_cs" TEXT NOT NULL, "body_en" TEXT, "status" VARCHAR(255) DEFAULT 'draft', "publishedAt" TIMESTAMP WITH TIME ZONE, "seller" TEXT, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, PRIMARY KEY ("id"))`;

const FIRST_VERSION = '2026-11-02';

const FIRST_TEXTS = [
  { document: 'terms', body_cs: TERMS_CS, body_en: TERMS_EN },
  { document: 'privacy', body_cs: PRIVACY_CS, body_en: PRIVACY_EN },
  { document: 'withdrawal', body_cs: WITHDRAWAL_CS, body_en: WITHDRAWAL_EN },
];

/** The seller's details as JSON, from the first `Sellers` row; the placeholders without one. */
const SELLER_SNAPSHOT = `COALESCE(
    (SELECT json_build_object('name', "name", 'ico', "ico", 'address', "address", 'email', "email",
        'phone', NULLIF("phone", ''), 'registration', NULLIF("registration", ''))::text
      FROM "Sellers" ORDER BY "createdAt", "id" LIMIT 1),
    '{"name":"Jméno Příjmení","ico":"12345678","address":"Ulice 1, 110 00 Praha 1","email":"info@klotilda.cz","phone":"+420 000 000 000","registration":"fyzická osoba podnikající podle živnostenského zákona"}')`;

/** Ids like the API's own: the model prefix and 32 hex characters. */
const INSERT_FIRST_VERSION = `INSERT INTO "LegalDocumentVersions" ("id", "document", "version", "body_cs", "body_en", "status", "publishedAt", "seller", "createdAt", "updatedAt")
  SELECT 'leg' || md5(random()::text || clock_timestamp()::text), $document, $version, $body_cs,
    $body_en, 'published', now(), ${SELLER_SNAPSHOT}, now(), now()
  WHERE NOT EXISTS (SELECT 1 FROM "LegalDocumentVersions" WHERE "document" = $document::varchar)`;

export const legalDocuments: Migration = {
  name: '2026-11-01-legal-documents',
  async up({ sequelize }) {
    await sequelize.query(CREATE_LEGAL_DOCUMENT_VERSIONS);
    for (const text of FIRST_TEXTS) {
      await sequelize.query(INSERT_FIRST_VERSION, { bind: { ...text, version: FIRST_VERSION } });
    }
  },
};
