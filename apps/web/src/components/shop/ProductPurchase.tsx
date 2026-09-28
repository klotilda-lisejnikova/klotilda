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
      <p className="mt-5 text-2xl font-light text-stone-800 tabular-nums">
        {live.price.toLocaleString("cs-CZ")}&nbsp;
        <span className="text-lg text-stone-500">{t("currency")}</span>
      </p>

      <div className="my-7 h-px bg-stone-200" />

      <p className="mb-6 flex items-center gap-2.5 text-[0.7rem] tracking-[0.2em] uppercase">
        <span
          aria-hidden="true"
          className={`h-1.5 w-1.5 rounded-full ${inStock ? "bg-moss" : "bg-stone-300"}`}
        />
        {!inStock ? (
          <span className="text-stone-400">{t("soldOut")}</span>
        ) : live.stockCount === 1 ? (
          <span className="text-moss">{t("lastPieceOriginal")}</span>
        ) : (
          <span className="text-moss">
            {t("piecesInStock", { count: live.stockCount })}
          </span>
        )}
      </p>

      {children}

      <div className="mt-auto">
        <AddToCartButton product={live} />
      </div>
    </>
  );
}
