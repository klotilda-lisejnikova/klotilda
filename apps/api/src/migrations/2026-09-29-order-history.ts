import type { Migration } from '@eleansphere/be-core';

/** Orders keep their parcel number and a history of what the admin did with them. */
export const orderHistory: Migration = {
  name: '2026-09-29-order-history',
  async up({ sequelize }) {
    await sequelize.query(
      `ALTER TABLE "Orders" ADD COLUMN IF NOT EXISTS "trackingNumber" VARCHAR(255)`
    );
    await sequelize.query(`ALTER TABLE "Orders" ADD COLUMN IF NOT EXISTS "history" TEXT`);
  },
};
