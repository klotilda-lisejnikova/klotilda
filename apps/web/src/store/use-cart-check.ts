"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@eleansphere/entity-core";
import { getProduct } from "@/services";
import { useCartStore, type CheckedProduct } from "./cart.store";

/** A product the shop no longer shows answers 404; any other failure leaves the line alone. */
async function lookUp(productId: string): Promise<CheckedProduct | undefined> {
  try {
    return await getProduct(productId);
  } catch (err) {
    if (err instanceof ApiError && err.isNotFound) return null;
    return undefined;
  }
}

/**
 * Looks at the shop again for everything in the cart — price, stock, whether it is still on
 * offer — whenever `when` turns true (the drawer opening, the checkout loading), and on demand.
 */
export function useCartCheck(when: boolean) {
  const applyCheck = useCartStore((state) => state.applyCheck);
  const [checking, setChecking] = useState(false);

  const check = useCallback(async () => {
    const ids = useCartStore.getState().items.map((item) => item.productId);
    if (ids.length === 0) return;
    setChecking(true);
    try {
      const found = await Promise.all(
        ids.map(async (id) => [id, await lookUp(id)] as const),
      );
      const checked = new Map<string, CheckedProduct>();
      for (const [id, product] of found)
        if (product !== undefined) checked.set(id, product);
      applyCheck(checked);
    } finally {
      setChecking(false);
    }
  }, [applyCheck]);

  useEffect(() => {
    if (when) void check();
  }, [when, check]);

  return { checking, check };
}
