import type { Migration } from '@eleansphere/be-core';

/**
 * Categories become rows the admin manages instead of a fixed list in the code. The three crafts
 * the list held are created, and products and gallery pictures move from the `category` slug
 * column to a `categoryId` foreign key. Safe to run again, and on a schema `sync()` built.
 */
const CREATE_CATEGORIES = `CREATE TABLE IF NOT EXISTS "Categories" ("id" VARCHAR(255) NOT NULL, "slug" VARCHAR(255) NOT NULL UNIQUE, "name_cs" VARCHAR(255) NOT NULL, "name_en" VARCHAR(255), "sortOrder" INTEGER DEFAULT 0, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, PRIMARY KEY ("id"))`;

/** The slugs the old fixed list used, so existing rows and shop links keep their category. */
const FIRST_CATEGORIES = [
  { slug: 'keramika', name_cs: 'Keramika', name_en: 'Ceramics' },
  { slug: 'vysivka', name_cs: 'Výšivka', name_en: 'Embroidery' },
  { slug: 'linoryt', name_cs: 'Linoryt', name_en: 'Linocut' },
];

/** Ids like the API's own: the model prefix and 32 hex characters. */
const INSERT_CATEGORY = `INSERT INTO "Categories" ("id", "slug", "name_cs", "name_en", "sortOrder", "createdAt", "updatedAt")
  VALUES ('cat' || md5(random()::text || clock_timestamp()::text), $slug, $name_cs, $name_en, $sortOrder, now(), now())
  ON CONFLICT ("slug") DO NOTHING`;

const TABLES_WITH_CATEGORY = ['Products', 'GalleryItems'];

export const categories: Migration = {
  name: '2026-09-28-categories',
  async up({ sequelize }) {
    await sequelize.query(CREATE_CATEGORIES);
    for (const [sortOrder, category] of FIRST_CATEGORIES.entries()) {
      await sequelize.query(INSERT_CATEGORY, { bind: { ...category, sortOrder } });
    }

    for (const table of TABLES_WITH_CATEGORY) {
      await sequelize.query(
        `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "categoryId" VARCHAR(255) REFERENCES "Categories" ("id") ON DELETE NO ACTION ON UPDATE CASCADE`
      );
      const [legacyColumn] = await sequelize.query(
        `SELECT 1 FROM information_schema.columns
         WHERE table_schema = current_schema() AND table_name = $table AND column_name = 'category'`,
        { bind: { table } }
      );
      if (legacyColumn.length === 0) continue;
      await sequelize.query(
        `UPDATE "${table}" AS row SET "categoryId" = category."id"
         FROM "Categories" AS category
         WHERE row."category" = category."slug" AND row."categoryId" IS NULL`
      );
      await sequelize.query(`ALTER TABLE "${table}" DROP COLUMN "category"`);
    }
  },
};
