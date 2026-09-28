import type { Migration } from '@eleansphere/be-core';

/** Orders keep which terms the customer agreed to at checkout, and when. */
export const orderTerms: Migration = {
  name: '2026-09-29-order-terms',
  async up({ sequelize }) {
    await sequelize.query(
      `ALTER TABLE "Orders" ADD COLUMN IF NOT EXISTS "termsVersion" VARCHAR(255)`
    );
    await sequelize.query(
      `ALTER TABLE "Orders" ADD COLUMN IF NOT EXISTS "termsAcceptedAt" TIMESTAMP WITH TIME ZONE`
    );
  },
};
