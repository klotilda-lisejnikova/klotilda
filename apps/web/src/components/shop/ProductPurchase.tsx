"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ApiError } from "@eleansphere/entity-core";
import { useTranslations } from "next-intl";
import { getProduct, type Product } from "@/services";
import AddToCartButton from "@/components/shop/AddToCartButton";

/**
 * Price, availability and the add-to-cart button. The page around it is cached for a minute;
 * this part looks at the shop again once the page is open, so a piece sold meanwhile shows as
 * sold out straight away. `children` (the description) sits between the stock and the button.
 */
export default function ProductPurchase({
  product,
  children,
}: {
  product: Product;
  children?: ReactNode;
}) {
  const t = useTranslations("shop");
  const [live, setLive] = useState(product);

  useEffect(() => {
    let cancelled = false;
    getProduct(product.id)
      .then((fresh) => !cancelled && setLive(fresh))
      .catch((err: unknown) => {
        // Withdrawn since the page was cached: nothing left to buy.
        if (!cancelled && err instanceof ApiError && err.isNotFound) {
          setLive((current) => ({ ...current, stockCount: 0 }));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [product.id]);

  const inStock = live.stockCount > 0;

  return (
    <>
      <p className="mt-4 text-3xl font-light text-stone-800 tabular-nums">
        {live.price.toLocaleString("cs-CZ")}&nbsp;
        <span className="text-xl text-stone-500">{t("currency")}</span>
      </p>

      <div className="my-6 h-px bg-stone-100" />

      <div className="mb-6">
        {inStock ? (
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2 items-center justify-center">
              <span className="absolute h-2 w-2 animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-sm text-emerald-700">
              {t("inStock")}
              <span className="ml-1.5 text-emerald-500/80">
                · {t("pieces", { count: live.stockCount })}
              </span>
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-rose-400" />
            <span className="text-sm text-rose-600">{t("soldOut")}</span>
          </div>
        )}
      </div>

      {children}

      <div className="mt-auto">
        <AddToCartButton product={live} />
      </div>
    </>
  );
}
