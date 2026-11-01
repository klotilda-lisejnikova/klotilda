import type { Migration } from '@eleansphere/be-core';

/**
 * Shipping methods become rows the admin manages instead of a fixed list in the code. The three
 * the list held are created with the prices it charged, and every order gets the name and kind of
 * the method it was placed with (and, once shipped, its tracking link). Safe to run again, and on
 * a schema `sync()` built. Frozen: it uses nothing from the domain, which may change later.
 */
const CREATE_SHIPPING_METHODS = `CREATE TABLE IF NOT EXISTS "ShippingMethods" ("id" VARCHAR(255) NOT NULL, "code" VARCHAR(255) NOT NULL UNIQUE, "name_cs" VARCHAR(255) NOT NULL, "name_en" VARCHAR(255), "description_cs" TEXT, "description_en" TEXT, "price" FLOAT NOT NULL, "kind" VARCHAR(255) NOT NULL, "trackingUrl" VARCHAR(255), "active" BOOLEAN DEFAULT true, "sortOrder" INTEGER DEFAULT 0, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, PRIMARY KEY ("id"))`;

/** The codes the old fixed list used, so existing orders and carts keep their method. */
const FIRST_METHODS = [
  {
    code: 'zasilkovna',
    name_cs: 'Zásilkovna',
    name_en: 'Zásilkovna (Packeta)',
    price: 99,
    kind: 'delivery',
    trackingUrl: 'https://tracking.packeta.com/cs/?id={number}',
  },
  {
    code: 'ceska_posta',
    name_cs: 'Česká pošta',
    name_en: 'Czech Post',
    price: 129,
    kind: 'delivery',
    trackingUrl: 'https://www.postaonline.cz/trackandtrace/-/zasilka/cislo?parcelNumbers={number}',
  },
  {
    code: 'osobni_odber',
    name_cs: 'Osobní odběr v Praze',
    name_en: 'Personal pickup in Prague',
    price: 0,
    kind: 'pickup',
    trackingUrl: null,
  },
];

/** Ids like the API's own: the model prefix and 32 hex characters. */
const INSERT_METHOD = `INSERT INTO "ShippingMethods" ("id", "code", "name_cs", "name_en", "price", "kind", "trackingUrl", "active", "sortOrder", "createdAt", "updatedAt")
  VALUES ('shp' || md5(random()::text || clock_timestamp()::text), $code, $name_cs, $name_en, $price, $kind, $trackingUrl, true, $sortOrder, now(), now())
  ON CONFLICT ("code") DO NOTHING`;

export const shippingMethods: Migration = {
  name: '2026-11-01-shipping-methods',
  async up({ sequelize }) {
    await sequelize.query(CREATE_SHIPPING_METHODS);
    for (const [sortOrder, method] of FIRST_METHODS.entries()) {
      await sequelize.query(INSERT_METHOD, { bind: { ...method, sortOrder } });
    }

    for (const column of ['shippingName', 'shippingKind']) {
      await sequelize.query(
        `ALTER TABLE "Orders" ADD COLUMN IF NOT EXISTS "${column}" VARCHAR(255)`
      );
    }
    await sequelize.query(`ALTER TABLE "Orders" ADD COLUMN IF NOT EXISTS "trackingUrl" TEXT`);
    // An order placed with a method that no longer exists keeps its code as the name.
    await sequelize.query(
      `UPDATE "Orders" SET
         "shippingName" = COALESCE("shippingName",
           (SELECT m."name_cs" FROM "ShippingMethods" AS m WHERE m."code" = "Orders"."shippingMethod"),
           "shippingMethod"),
         "shippingKind" = COALESCE("shippingKind",
           (SELECT m."kind" FROM "ShippingMethods" AS m WHERE m."code" = "Orders"."shippingMethod"),
           CASE WHEN "shippingMethod" = 'osobni_odber' THEN 'pickup' ELSE 'delivery' END)
       WHERE "shippingName" IS NULL OR "shippingKind" IS NULL`
    );
    await sequelize.query(`ALTER TABLE "Orders" ALTER COLUMN "shippingName" SET NOT NULL`);
    await sequelize.query(`ALTER TABLE "Orders" ALTER COLUMN "shippingKind" SET NOT NULL`);

    // Shipped orders link their parcel as the e-mail did, from the method's template.
    const [rows] = await sequelize.query(
      `SELECT o."id", o."trackingNumber", m."trackingUrl" AS "template"
       FROM "Orders" AS o JOIN "ShippingMethods" AS m ON m."code" = o."shippingMethod"
       WHERE o."trackingNumber" IS NOT NULL AND o."trackingUrl" IS NULL`
    );
    const shipped = rows as { id: string; trackingNumber: string; template: string | null }[];
    for (const order of shipped) {
      if (!order.template) continue;
      const url = order.template.replaceAll('{number}', encodeURIComponent(order.trackingNumber));
      await sequelize.query(`UPDATE "Orders" SET "trackingUrl" = $url WHERE "id" = $id`, {
        bind: { url, id: order.id },
      });
    }
  },
};
