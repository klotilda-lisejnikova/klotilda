import type { Migration } from '@eleansphere/be-core';

/**
 * Payment methods become rows the admin manages: the bank transfer every order was paid by so far,
 * and cash at pickup. Every order gets the method's code, name, kind and fee — the older ones the
 * transfer's, at no fee. Safe to run again, and on a schema `sync()` built. Frozen: it uses nothing
 * from the domain, which may change later.
 */
const CREATE_PAYMENT_METHODS = `CREATE TABLE IF NOT EXISTS "PaymentMethods" ("id" VARCHAR(255) NOT NULL, "code" VARCHAR(255) NOT NULL UNIQUE, "name_cs" VARCHAR(255) NOT NULL, "name_en" VARCHAR(255), "description_cs" TEXT, "description_en" TEXT, "fee" FLOAT NOT NULL, "kind" VARCHAR(255) NOT NULL, "active" BOOLEAN DEFAULT true, "sortOrder" INTEGER DEFAULT 0, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, PRIMARY KEY ("id"))`;

const BANK_TRANSFER = {
  code: 'prevod',
  name_cs: 'Bankovní převod',
  name_en: 'Bank transfer',
  description_cs: 'Předem na účet, QR kódem nebo podle údajů z potvrzení objednávky.',
  description_en: 'In advance, by QR code or with the details from the order confirmation.',
  kind: 'bank_transfer',
};

const FIRST_METHODS = [
  BANK_TRANSFER,
  {
    code: 'hotove',
    name_cs: 'Hotově při převzetí',
    name_en: 'Cash on pickup',
    description_cs: 'Jen při osobním odběru.',
    description_en: 'With personal pickup only.',
    kind: 'cash',
  },
];

/** Ids like the API's own: the model prefix and 32 hex characters. */
const INSERT_METHOD = `INSERT INTO "PaymentMethods" ("id", "code", "name_cs", "name_en", "description_cs", "description_en", "fee", "kind", "active", "sortOrder", "createdAt", "updatedAt")
  VALUES ('pay' || md5(random()::text || clock_timestamp()::text), $code, $name_cs, $name_en, $description_cs, $description_en, 0, $kind, true, $sortOrder, now(), now())
  ON CONFLICT ("code") DO NOTHING`;

export const paymentMethods: Migration = {
  name: '2026-11-01-payment-methods',
  async up({ sequelize }) {
    await sequelize.query(CREATE_PAYMENT_METHODS);
    for (const [sortOrder, method] of FIRST_METHODS.entries()) {
      await sequelize.query(INSERT_METHOD, { bind: { ...method, sortOrder } });
    }

    for (const column of ['paymentMethod', 'paymentName', 'paymentKind']) {
      await sequelize.query(
        `ALTER TABLE "Orders" ADD COLUMN IF NOT EXISTS "${column}" VARCHAR(255)`
      );
    }
    await sequelize.query(
      `ALTER TABLE "Orders" ADD COLUMN IF NOT EXISTS "paymentFee" FLOAT DEFAULT '0'`
    );
    // Every order so far was paid by transfer.
    await sequelize.query(
      `UPDATE "Orders" SET
         "paymentMethod" = COALESCE("paymentMethod", $code),
         "paymentName" = COALESCE("paymentName", $name_cs),
         "paymentKind" = COALESCE("paymentKind", $kind),
         "paymentFee" = COALESCE("paymentFee", 0)
       WHERE "paymentMethod" IS NULL OR "paymentName" IS NULL OR "paymentKind" IS NULL
         OR "paymentFee" IS NULL`,
      {
        bind: {
          code: BANK_TRANSFER.code,
          name_cs: BANK_TRANSFER.name_cs,
          kind: BANK_TRANSFER.kind,
        },
      }
    );
    for (const column of ['paymentMethod', 'paymentName', 'paymentKind']) {
      await sequelize.query(`ALTER TABLE "Orders" ALTER COLUMN "${column}" SET NOT NULL`);
    }
  },
};
