import type { Migration } from '@eleansphere/be-core';

/**
 * The seller's details become one row the admin edits, starting from the placeholders the code
 * showed. Safe to run again (an existing row is left alone), and on a schema `sync()` built.
 * Frozen: it uses nothing from the domain.
 */
const CREATE_SELLERS = `CREATE TABLE IF NOT EXISTS "Sellers" ("id" VARCHAR(255) NOT NULL, "name" VARCHAR(255) NOT NULL, "ico" VARCHAR(255) NOT NULL, "address" VARCHAR(255) NOT NULL, "email" VARCHAR(255) NOT NULL, "phone" VARCHAR(255), "registration" VARCHAR(255), "complete" BOOLEAN DEFAULT false, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, PRIMARY KEY ("id"))`;

/** Ids like the API's own: the model prefix and 32 hex characters. */
const INSERT_FIRST_SELLER = `INSERT INTO "Sellers" ("id", "name", "ico", "address", "email", "phone", "registration", "complete", "createdAt", "updatedAt")
  SELECT 'sel' || md5(random()::text || clock_timestamp()::text), 'Jméno Příjmení', '12345678',
    'Ulice 1, 110 00 Praha 1', 'info@klotilda.cz', '+420 000 000 000',
    'fyzická osoba podnikající podle živnostenského zákona', false, now(), now()
  WHERE NOT EXISTS (SELECT 1 FROM "Sellers")`;

export const seller: Migration = {
  name: '2026-11-01-seller',
  async up({ sequelize }) {
    await sequelize.query(CREATE_SELLERS);
    await sequelize.query(INSERT_FIRST_SELLER);
  },
};
