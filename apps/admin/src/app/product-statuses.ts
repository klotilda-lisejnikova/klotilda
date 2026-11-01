/** The tabs of the products list: whether a product sells now, as filters the API applies. */
export interface ProductStatus {
  value: string;
  label: string;
  filter: { active?: boolean; stockCount?: number | { gte: number } };
  /** The tab shows how many products are in it. */
  counted?: boolean;
}

/**
 * Apart from "all", every product is in exactly one tab; a hidden one is hidden whatever its stock.
 * Both columns allow NULL, though: a row holding one shows only under "all".
 */
export const PRODUCT_STATUSES: ProductStatus[] = [
  { value: 'all', label: 'Všechny', filter: {} },
  {
    value: 'for-sale',
    label: 'K prodeji',
    filter: { active: true, stockCount: { gte: 1 } },
    counted: true,
  },
  { value: 'sold-out', label: 'Vyprodané', filter: { active: true, stockCount: 0 }, counted: true },
  { value: 'hidden', label: 'Skryté', filter: { active: false }, counted: true },
];
