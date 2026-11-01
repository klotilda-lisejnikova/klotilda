import { SELLER, sellerEntity, sellerLine } from '@klotilda/domain';
import type { ModelRegistry } from '../models-registry';

/**
 * The seller as the e-mails name them (`sellerLine`), from the `Seller` row the admin edits; the
 * domain's defaults when the row is missing or can't be read, so an e-mail still goes out.
 */
export async function resolveSellerLine(registry: ModelRegistry): Promise<string> {
  const row = await registry
    .get(sellerEntity.config.name)
    .findOne({
      order: [
        ['createdAt', 'ASC'],
        ['id', 'ASC'],
      ],
    })
    .catch((err: unknown) => {
      console.error('Reading the seller failed, naming the default:', err);
      return null;
    });
  if (!row) return sellerLine(SELLER);
  return sellerLine({
    name: String(row.get('name')),
    ico: String(row.get('ico')),
    address: String(row.get('address')),
  });
}
