import { SELLER, sellerEntity, sellerLine } from '@klotilda/domain';
import type { LegalSellerSnapshot } from '@klotilda/domain';
import type { Sequelize } from '@eleansphere/be-core';
import type { ModelRegistry } from '../models-registry';

type Transaction = Awaited<ReturnType<Sequelize['transaction']>>;

/** The domain's defaults, named while the row is missing. */
const DEFAULT_SELLER: LegalSellerSnapshot = {
  name: SELLER.name,
  ico: SELLER.ico,
  address: SELLER.address,
  email: SELLER.email,
  phone: SELLER.phone,
  registration: SELLER.registration,
};

/** A text column, empty as none. */
const optionalText = (value: unknown) => (typeof value === 'string' && value !== '' ? value : null);

/**
 * The seller's details from the `Seller` row the admin edits (the first, should there be more);
 * the domain's defaults when the row is missing.
 */
export async function resolveSeller(
  registry: ModelRegistry,
  transaction?: Transaction
): Promise<LegalSellerSnapshot> {
  const row = await registry.get(sellerEntity.config.name).findOne({
    order: [
      ['createdAt', 'ASC'],
      ['id', 'ASC'],
    ],
    transaction,
  });
  if (!row) return DEFAULT_SELLER;
  return {
    name: String(row.get('name')),
    ico: String(row.get('ico')),
    address: String(row.get('address')),
    email: String(row.get('email')),
    phone: optionalText(row.get('phone')),
    registration: optionalText(row.get('registration')),
  };
}

/**
 * The seller as the e-mails name them (`sellerLine`); the domain's defaults also when the row
 * can't be read, so an e-mail still goes out.
 */
export async function resolveSellerLine(registry: ModelRegistry): Promise<string> {
  const seller = await resolveSeller(registry).catch((err: unknown) => {
    console.error('Reading the seller failed, naming the default:', err);
    return DEFAULT_SELLER;
  });
  return sellerLine(seller);
}
