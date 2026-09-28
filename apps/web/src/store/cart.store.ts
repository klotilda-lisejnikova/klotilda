import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { MAX_ITEM_QUANTITY } from "@klotilda/domain";
import type { Product } from "@/services";

/** What the last check against the shop found wrong with a line. */
export type CartIssue = "soldOut" | "unavailable" | "priceChanged" | "reduced";

/** A problem that stops the order until the visitor removes the line. */
const BLOCKING_ISSUES: readonly CartIssue[] = ["soldOut", "unavailable"];

export interface CartItem {
  productId: string;
  name_cs: string;
  name_en: string | null;
  /** CZK, as the shop last said. The server charges its own price anyway. */
  price: number;
  quantity: number;
  /** Pieces in stock when last seen; caps the quantity. */
  stockCount: number;
  /** URL of the first photo, when there is one. */
  image: string | null;
  issue?: CartIssue;
  /** The price before a `priceChanged`. */
  previousPrice?: number;
}

/** A product as the shop knows it now; `null` when it is gone (deleted or hidden). */
export type CheckedProduct = Product | null;

interface CartStore {
  items: CartItem[];
  /** Adds one piece: a new line, or one more of a line already there (never past the stock). */
  addItem: (product: Product) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  /** Updates the lines from a fresh look at the shop; products missing from `checked` are left. */
  applyCheck: (checked: ReadonlyMap<string, CheckedProduct>) => void;
}

/** The most of one product a single order may hold. */
export function maxQuantity(item: Pick<CartItem, "stockCount">): number {
  return Math.min(item.stockCount, MAX_ITEM_QUANTITY);
}

export function isBlocked(item: CartItem): boolean {
  return item.issue !== undefined && BLOCKING_ISSUES.includes(item.issue);
}

export function itemName(item: CartItem, locale: string): string {
  return locale === "en" && item.name_en ? item.name_en : item.name_cs;
}

export function cartTotal(items: CartItem[]): number {
  return items
    .filter((item) => !isBlocked(item))
    .reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

function snapshot(product: Product): Omit<CartItem, "quantity"> {
  return {
    productId: product.id,
    name_cs: product.name_cs,
    name_en: product.name_en ?? null,
    price: product.price,
    stockCount: product.stockCount,
    image: product.images[0]?.url ?? null,
  };
}

function checkedLine(item: CartItem, product: CheckedProduct): CartItem {
  if (product === null) return { ...item, issue: "unavailable" };
  const fresh = {
    ...item,
    ...snapshot(product),
    issue: undefined,
    previousPrice: undefined,
  };
  if (product.stockCount <= 0) return { ...fresh, issue: "soldOut" };
  if (item.quantity > maxQuantity(fresh)) {
    return { ...fresh, quantity: maxQuantity(fresh), issue: "reduced" };
  }
  if (product.price !== item.price) {
    return { ...fresh, issue: "priceChanged", previousPrice: item.price };
  }
  return fresh;
}

/** Carts saved before 2026-09-28 held one name and no stock; the next check fills the rest in. */
interface LegacyCartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

const STORE_VERSION = 1;

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      items: [],

      addItem: (product) =>
        set((state) => {
          const existing = state.items.find((i) => i.productId === product.id);
          if (!existing) {
            if (product.stockCount <= 0) return state;
            return {
              items: [...state.items, { ...snapshot(product), quantity: 1 }],
            };
          }
          const updated = { ...existing, ...snapshot(product) };
          const quantity = Math.min(
            existing.quantity + 1,
            maxQuantity(updated),
          );
          return {
            items: state.items.map((i) =>
              i.productId === product.id ? { ...updated, quantity } : i,
            ),
          };
        }),

      setQuantity: (productId, quantity) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId
              ? {
                  ...i,
                  quantity: Math.max(1, Math.min(quantity, maxQuantity(i))),
                }
              : i,
          ),
        })),

      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        })),

      clearCart: () => set({ items: [] }),

      applyCheck: (checked) =>
        set((state) => ({
          items: state.items.map((item) =>
            checked.has(item.productId)
              ? checkedLine(item, checked.get(item.productId) ?? null)
              : item,
          ),
        })),
    }),
    {
      name: "klotilda-cart",
      version: STORE_VERSION,
      migrate: (persisted) => {
        const legacy =
          (persisted as { items?: LegacyCartItem[] } | undefined)?.items ?? [];
        return {
          items: legacy.map((item): CartItem => ({
            productId: item.productId,
            name_cs: item.name,
            name_en: null,
            price: item.price,
            quantity: item.quantity,
            stockCount: item.quantity,
            image: null,
          })),
        };
      },
    },
  ),
);

/**
 * The cart as the page may show it: empty until the browser has mounted, so the server's HTML
 * (which cannot see localStorage) and the first client render agree.
 */
export function useCart(): CartItem[] {
  const items = useCartStore((state) => state.items);
  return useMounted() ? items : [];
}

/** False during the server render and the first client render, true afterwards. */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
