import type { Migration } from '@eleansphere/be-core';

/**
 * The schema as `sync()` created it on 2026-09-27, frozen, so later model changes can't alter what
 * this migration builds. `IF NOT EXISTS` throughout: production's tables were made by the older
 * be-core's `sync()`, with the same columns, so there it only adds what be-core 3 brought — the
 * `Files` indexes and the `RefreshTokens` table. On an empty database it creates everything.
 * Table names are unqualified: the connection's `search_path` puts them in the configured schema.
 */
const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "AdminUsers" ("id" VARCHAR(255) NOT NULL, "email" VARCHAR(255) NOT NULL UNIQUE, "password" VARCHAR(255) NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, PRIMARY KEY ("id"))`,
  `CREATE TABLE IF NOT EXISTS "Products" ("id" VARCHAR(255) NOT NULL, "name_cs" VARCHAR(255) NOT NULL, "name_en" VARCHAR(255), "description_cs" TEXT, "description_en" TEXT, "price" FLOAT NOT NULL, "category" VARCHAR(255), "stockCount" INTEGER DEFAULT 1, "active" BOOLEAN DEFAULT true, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, PRIMARY KEY ("id"))`,
  `CREATE TABLE IF NOT EXISTS "GalleryItems" ("id" VARCHAR(255) NOT NULL, "title_cs" VARCHAR(255) NOT NULL, "title_en" VARCHAR(255), "category" VARCHAR(255), "row" INTEGER DEFAULT 1, "sortOrder" INTEGER DEFAULT 0, "active" BOOLEAN DEFAULT true, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, PRIMARY KEY ("id"))`,
  `CREATE TABLE IF NOT EXISTS "Orders" ("id" VARCHAR(255) NOT NULL, "customerFirstName" VARCHAR(255) NOT NULL, "customerLastName" VARCHAR(255) NOT NULL, "customerEmail" VARCHAR(255) NOT NULL, "customerPhone" VARCHAR(255), "street" VARCHAR(255) NOT NULL, "city" VARCHAR(255) NOT NULL, "zip" VARCHAR(255) NOT NULL, "shippingMethod" VARCHAR(255) NOT NULL, "notes" TEXT, "shippingPrice" FLOAT DEFAULT '0', "items" TEXT NOT NULL, "totalAmount" FLOAT NOT NULL, "variableSymbol" VARCHAR(255) NOT NULL, "paymentStatus" VARCHAR(255) DEFAULT 'pending', "orderStatus" VARCHAR(255) DEFAULT 'new', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, PRIMARY KEY ("id"))`,
  `CREATE TABLE IF NOT EXISTS "Files" ("id" VARCHAR(255) NOT NULL, "storageKey" VARCHAR(255) NOT NULL, "originalName" VARCHAR(255), "mimeType" VARCHAR(255) NOT NULL, "size" INTEGER NOT NULL, "checksum" VARCHAR(255), "visibility" VARCHAR(255) DEFAULT 'public', "ownerId" VARCHAR(255), "refType" VARCHAR(255), "refId" VARCHAR(255), "role" VARCHAR(255), "sortOrder" INTEGER DEFAULT 0, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, PRIMARY KEY ("id"))`,
  `CREATE INDEX IF NOT EXISTS "files_ref_type_ref_id_role" ON "Files" ("refType", "refId", "role")`,
  `CREATE INDEX IF NOT EXISTS "files_owner_id" ON "Files" ("ownerId")`,
  `CREATE TABLE IF NOT EXISTS "RefreshTokens" ("id" VARCHAR(255) NOT NULL, "userId" VARCHAR(255) NOT NULL REFERENCES "AdminUsers" ("id") ON DELETE CASCADE ON UPDATE CASCADE, "familyId" VARCHAR(255) NOT NULL, "secretHash" VARCHAR(255) NOT NULL, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "revokedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, PRIMARY KEY ("id"))`,
  `CREATE INDEX IF NOT EXISTS "refresh_tokens_user_id" ON "RefreshTokens" ("userId")`,
  `CREATE INDEX IF NOT EXISTS "refresh_tokens_family_id" ON "RefreshTokens" ("familyId")`,
];

export const baseline: Migration = {
  name: '2026-09-27-baseline',
  async up({ sequelize }) {
    for (const statement of STATEMENTS) await sequelize.query(statement);
  },
};
