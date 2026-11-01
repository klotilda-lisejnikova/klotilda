import type { Migration } from '@eleansphere/be-core';

/**
 * Shipping methods may send to a carrier's pickup point the customer chooses at checkout, and an
 * order keeps that point. Zásilkovna (seeded by `2026-11-01-shipping-methods`) is such a method.
 * Older orders keep no point. Safe to run again, and on a schema `sync()` built. Frozen: it uses
 * nothing from the domain.
 */
const ORDER_COLUMNS = ['pickupPointId', 'pickupPointName', 'pickupPointAddress', 'pickupPointType'];

export const pickupPoints: Migration = {
  name: '2026-11-01-pickup-points',
  async up({ sequelize }) {
    await sequelize.query(
      `ALTER TABLE "ShippingMethods" ADD COLUMN IF NOT EXISTS "pickupNetwork" VARCHAR(255)`
    );
    await sequelize.query(
      `UPDATE "ShippingMethods" SET "pickupNetwork" = 'packeta'
       WHERE "code" = 'zasilkovna' AND "pickupNetwork" IS NULL AND "kind" = 'delivery'`
    );
    for (const column of ORDER_COLUMNS) {
      await sequelize.query(
        `ALTER TABLE "Orders" ADD COLUMN IF NOT EXISTS "${column}" VARCHAR(255)`
      );
    }
  },
};
