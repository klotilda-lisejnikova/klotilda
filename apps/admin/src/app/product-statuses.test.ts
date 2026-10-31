import { describe, expect, it } from 'vitest';
import { PRODUCT_STATUSES } from './product-statuses';
import type { ProductStatus } from './product-statuses';

interface Stocked {
  active: boolean;
  stockCount: number;
}

/** What the API does with a status filter, for the two columns it names. */
function matches({ filter }: ProductStatus, product: Stocked): boolean {
  if (filter.active !== undefined && filter.active !== product.active) return false;
  const stock = filter.stockCount;
  if (typeof stock === 'number') return product.stockCount === stock;
  return stock === undefined || product.stockCount >= stock.gte;
}

describe('product statuses', () => {
  it('put every product in exactly one counted tab', () => {
    const products: Stocked[] = [true, false].flatMap((active) =>
      [0, 1, 5].map((stockCount) => ({ active, stockCount }))
    );
    const counted = PRODUCT_STATUSES.filter((status) => status.counted);
    for (const product of products) {
      const tabs = counted.filter((status) => matches(status, product)).map((tab) => tab.value);
      expect(tabs, JSON.stringify(product)).toHaveLength(1);
    }
  });
});
