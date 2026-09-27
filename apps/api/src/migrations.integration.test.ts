import crypto from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createCore,
  createSequelize,
  MemoryStorageAdapter,
  MIGRATIONS_TABLE,
} from '@eleansphere/be-core';
import type { Sequelize } from '@eleansphere/be-core';
import { buildAppConfig } from './app-config';
import { bearer, startTestApp, TEST_DATABASE_URL, testEnvironment } from './test-support/test-app';
import type { TestApp } from './test-support/test-app';

interface SchemaRow {
  [column: string]: unknown;
}

/** The schema's tables, columns, indexes and constraints, with its name taken out. */
async function describeSchema(database: Sequelize, schema: string) {
  const select = async (sql: string) => {
    const [rows] = await database.query(sql, { bind: [schema] });
    return JSON.parse(JSON.stringify(rows).replaceAll(`${schema}.`, '')) as SchemaRow[];
  };
  return {
    columns: await select(`
      SELECT table_name, column_name, data_type, is_nullable, column_default,
             character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = $1 AND table_name <> '${MIGRATIONS_TABLE}'
      ORDER BY table_name, column_name`),
    indexes: await select(`
      SELECT tablename, indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = $1 AND tablename <> '${MIGRATIONS_TABLE}'
      ORDER BY tablename, indexname`),
    constraints: await select(`
      SELECT conrelid::regclass::text AS table_name, conname, pg_get_constraintdef(oid) AS definition
      FROM pg_constraint
      WHERE connamespace = $1::regnamespace
        AND conrelid::regclass::text NOT LIKE '%${MIGRATIONS_TABLE}'
      ORDER BY table_name, conname`),
  };
}

/**
 * Production as the older be-core's `sync()` left it: the same tables, but `Files` without
 * indexes and no `RefreshTokens`. A product with a photo and an order in it.
 */
const LEGACY_PRODUCTION = [
  `CREATE TABLE "AdminUsers" ("id" VARCHAR(255) NOT NULL, "email" VARCHAR(255) NOT NULL UNIQUE, "password" VARCHAR(255) NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, PRIMARY KEY ("id"))`,
  `CREATE TABLE "Products" ("id" VARCHAR(255) NOT NULL, "name_cs" VARCHAR(255) NOT NULL, "name_en" VARCHAR(255), "description_cs" TEXT, "description_en" TEXT, "price" FLOAT NOT NULL, "category" VARCHAR(255), "stockCount" INTEGER DEFAULT 1, "active" BOOLEAN DEFAULT true, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, PRIMARY KEY ("id"))`,
  `CREATE TABLE "GalleryItems" ("id" VARCHAR(255) NOT NULL, "title_cs" VARCHAR(255) NOT NULL, "title_en" VARCHAR(255), "category" VARCHAR(255), "row" INTEGER DEFAULT 1, "sortOrder" INTEGER DEFAULT 0, "active" BOOLEAN DEFAULT true, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, PRIMARY KEY ("id"))`,
  `CREATE TABLE "Orders" ("id" VARCHAR(255) NOT NULL, "customerFirstName" VARCHAR(255) NOT NULL, "customerLastName" VARCHAR(255) NOT NULL, "customerEmail" VARCHAR(255) NOT NULL, "customerPhone" VARCHAR(255), "street" VARCHAR(255) NOT NULL, "city" VARCHAR(255) NOT NULL, "zip" VARCHAR(255) NOT NULL, "shippingMethod" VARCHAR(255) NOT NULL, "shippingPrice" FLOAT DEFAULT '0', "items" TEXT NOT NULL, "totalAmount" FLOAT NOT NULL, "variableSymbol" VARCHAR(255) NOT NULL, "paymentStatus" VARCHAR(255) DEFAULT 'pending', "orderStatus" VARCHAR(255) DEFAULT 'new', "notes" TEXT, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, PRIMARY KEY ("id"))`,
  `CREATE TABLE "Files" ("id" VARCHAR(255) NOT NULL, "storageKey" VARCHAR(255) NOT NULL, "originalName" VARCHAR(255), "mimeType" VARCHAR(255) NOT NULL, "size" INTEGER NOT NULL, "checksum" VARCHAR(255), "visibility" VARCHAR(255) DEFAULT 'public', "ownerId" VARCHAR(255), "refType" VARCHAR(255), "refId" VARCHAR(255), "role" VARCHAR(255), "sortOrder" INTEGER DEFAULT 0, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, PRIMARY KEY ("id"))`,
  `INSERT INTO "Products" VALUES ('prod1', 'Váza', NULL, NULL, NULL, 1200, 'keramika', 1, true, now(), now())`,
  `INSERT INTO "Files" VALUES ('file1', 'Product/file1/vaza.jpg', 'vaza.jpg', 'image/jpeg', 10, NULL, 'public', 'adm1', 'Product', 'prod1', 'image', 0, now(), now())`,
  `INSERT INTO "Orders" VALUES ('ord1', 'Jana', 'Nová', 'jana@example.cz', NULL, 'Dlouhá 1', 'Praha', '11000', 'zasilkovna', 99, '[]', 1299, '1234567890', 'paid', 'shipped', NULL, now(), now())`,
];

describe('Migrations', () => {
  const database = createSequelize({ databaseUrl: TEST_DATABASE_URL, ssl: false });
  const syncedSchema = `test_sync_${crypto.randomBytes(6).toString('hex')}`;
  const legacySchema = `test_legacy_${crypto.randomBytes(6).toString('hex')}`;
  let migrated: TestApp;

  beforeAll(async () => {
    migrated = await startTestApp();
    await database.query(`CREATE SCHEMA "${syncedSchema}"`);
    const config = buildAppConfig(testEnvironment, { schema: syncedSchema, rateLimit: 'off' });
    const synced = await createCore({ ...config, syncMode: 'create', migrations: [] });
    await synced.close();
  });

  afterAll(async () => {
    await migrated?.close();
    await database.query(`DROP SCHEMA IF EXISTS "${syncedSchema}" CASCADE`);
    await database.query(`DROP SCHEMA IF EXISTS "${legacySchema}" CASCADE`);
    await database.close();
  });

  it('build the schema the models describe', async () => {
    expect(await describeSchema(database, migrated.schema)).toEqual(
      await describeSchema(database, syncedSchema)
    );
  });

  it('bring a database the older be-core made up to date, keeping its rows', async () => {
    await database.query(`CREATE SCHEMA "${legacySchema}"`);
    for (const statement of LEGACY_PRODUCTION) {
      await database.query(statement.replace(/"(\w+)" (\(|VALUES)/, `"${legacySchema}"."$1" $2`));
    }

    const core = await createCore(
      buildAppConfig(testEnvironment, {
        schema: legacySchema,
        rateLimit: 'off',
        storageAdapter: new MemoryStorageAdapter('https://media.test'),
      })
    );
    try {
      // Columns are compared by name, so the old tables' column order doesn't matter.
      expect(await describeSchema(database, legacySchema)).toEqual(
        await describeSchema(database, syncedSchema)
      );

      const product = await request(core.app).get('/api/products/prod1');
      expect(product.status).toBe(200);
      expect(product.body.images).toEqual([
        expect.objectContaining({ id: 'file1', url: 'https://media.test/Product/file1/vaza.jpg' }),
      ]);
      const order = await core.models.Order.findByPk('ord1');
      expect(order?.get('paymentStatus')).toBe('paid');
    } finally {
      await core.close();
    }
  });

  it('change nothing on a database sync() created, and are recorded as applied', async () => {
    const config = buildAppConfig(testEnvironment, { schema: syncedSchema, rateLimit: 'off' });
    const before = await describeSchema(database, syncedSchema);

    const core = await createCore(config);
    await core.close();

    expect(await describeSchema(database, syncedSchema)).toEqual(before);
    const [applied] = await database.query(
      `SELECT name FROM "${syncedSchema}"."${MIGRATIONS_TABLE}" ORDER BY name`
    );
    const expected = (config.migrations ?? []).map(({ name }) => ({ name }));
    expect(applied).toEqual(expected.sort((left, right) => left.name.localeCompare(right.name)));
  });

  it('are what the test apps run on', async () => {
    const token = await migrated.signInAdmin();
    expect(
      (await migrated.api().get('/api/orders').set('Authorization', bearer(token))).status
    ).toBe(200);
  });
});
