import type { Migration } from '@eleansphere/be-core';
import { baseline } from './2026-09-27-baseline';
import { categories } from './2026-09-28-categories';
import { orderHistory } from './2026-09-29-order-history';
import { orderTerms } from './2026-09-29-order-terms';
import { emailTemplates } from './2026-11-01-email-templates';
import { legalDocuments } from './2026-11-01-legal-documents';
import { paymentMethods } from './2026-11-01-payment-methods';
import { pickupPoints } from './2026-11-01-pickup-points';
import { seller } from './2026-11-01-seller';
import { shippingMethods } from './2026-11-01-shipping-methods';

/**
 * Every change to the database schema, in the order it was made; the API applies the pending ones
 * on startup (`syncMode: 'migrate'`). A model change needs a migration here too —
 * `migrations.integration.test.ts` fails until the migrated schema matches the models again.
 */
export const migrations: Migration[] = [
  baseline,
  categories,
  orderHistory,
  orderTerms,
  shippingMethods,
  paymentMethods,
  emailTemplates,
  seller,
  legalDocuments,
  pickupPoints,
];
