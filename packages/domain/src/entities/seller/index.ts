import { defineEntity } from '@eleansphere/entity-core';
import { sellerFields } from './fields';

export const SELLER_PATH = '/api/seller';

/**
 * Who sells: shown in the website's footer (§ 435 of the Civil Code), on the legal pages and in
 * the e-mails. One row, which the admin edits; it is never created or deleted through the API.
 */
export const sellerEntity = defineEntity({
  name: 'Seller',
  prefix: 'sel',
  basePath: SELLER_PATH,
  access: { read: 'public', write: 'auth' },
  fields: sellerFields,
  query: { sort: ['createdAt'], defaultSort: 'createdAt', defaultLimit: 1, maxLimit: 1 },
});

export type Seller = InstanceType<typeof sellerEntity.Dto>;

/** The details that name the seller, as a row or the defaults carry them. */
export type SellerDetails = Pick<Seller, 'name' | 'ico' | 'address'>;

/** "Jméno Příjmení, IČO 12345678, Ulice 1, 110 00 Praha 1" */
export function sellerLine(seller: SellerDetails): string {
  return `${seller.name}, IČO ${seller.ico}, ${seller.address}`;
}
