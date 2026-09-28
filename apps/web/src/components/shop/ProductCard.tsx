"use client";

import { useState } from "react";
import { mediaUrl } from "@/lib/media-url";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { Product } from "@/services";
import { maxQuantity, useCart, useCartStore } from "@/store/cart.store";
import { categoryName } from "@/lib/category";

interface Props {
  product: Product;
  locale: string;
  /** On screen at once (the first row): its photo loads before the rest. */
  eager?: boolean;
}

/** The grid is 2 columns, 3 from `lg`, 4 from `xl` inside a 1152px container. */
const CARD_SIZES = "(min-width: 1280px) 270px, (min-width: 1024px) 33vw, 50vw";

const BAG_ICON = "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z";
const CHECK_ICON = "M5 13l4 4L19 7";

/**
 * A product in the grid, drawn like a gallery card: a 3:4 photo with the category badge and a
 * paper strip with the name and price. Hovering shows the second photo, when there is one.
 * Adding to the cart: a strip that rises on hover, or a round button on touch screens.
 */
export default function ProductCard({ product, locale, eager = false }: Props) {
  const t = useTranslations("shop");
  const [failed, setFailed] = useState<Set<string>>(new Set());
  const addItem = useCartStore((state) => state.addItem);
  const cartLine = useCart().find((i) => i.productId === product.id);

  const name =
    locale === "en" && product.name_en ? product.name_en : product.name_cs;
  const inStock = product.stockCount > 0;
  // "In the cart" once there is no piece left to add.
  const full = !!cartLine && cartLine.quantity >= maxQuantity(product);
  const photos = product.images.filter((img) => !failed.has(img.id));
  const [first, second] = photos;

  const markFailed = (id: string) => setFailed((p) => new Set([...p, id]));

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (inStock && !full) addItem(product);
  };

  const addLabel = full
    ? t("inCart")
    : cartLine
      ? t("addAnotherShort")
      : t("addShort");

  return (
    <Link
      href={`/shop/${product.id}`}
      className="group focus-visible:outline-moss block overflow-hidden rounded-md focus-visible:outline-2 focus-visible:outline-offset-4"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-stone-200">
        {first && (
          <Image
            src={mediaUrl(first.url)}
            alt={name}
            fill
            sizes={CARD_SIZES}
            priority={eager}
            className={`object-cover ${inStock ? "" : "opacity-60 grayscale-[35%]"}`}
            onError={() => markFailed(first.id)}
          />
        )}
        {second && inStock && (
          <Image
            src={mediaUrl(second.url)}
            alt=""
            fill
            sizes={CARD_SIZES}
            className="object-cover opacity-0 transition-opacity duration-500 pointer-fine:group-hover:opacity-100"
            onError={() => markFailed(second.id)}
          />
        )}

        {product.category && (
          <span
            className="absolute top-3 right-3 z-10 px-2.5 py-1 text-[0.6rem] tracking-[0.2em] text-[#6b5e50] uppercase"
            style={{ background: "rgba(250,250,248,0.9)" }}
          >
            {categoryName(product.category, locale)}
          </span>
        )}

        {!inStock && (
          <span className="absolute inset-x-0 bottom-4 z-10 mx-auto w-max bg-[#fafaf8]/90 px-3 py-1 text-[0.65rem] tracking-[0.25em] text-stone-600 uppercase">
            {t("soldOut")}
          </span>
        )}

        {inStock && (
          <>
            {/* Mouse: a strip rises from the photo's bottom edge on hover. */}
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={full}
              tabIndex={-1}
              aria-hidden="true"
              className="bg-moss/90 hover:bg-moss-deep absolute inset-x-0 bottom-0 z-10 flex translate-y-full items-center justify-center gap-2 py-2.5 text-[0.65rem] tracking-[0.25em] text-[#fafaf8] uppercase opacity-0 transition-all duration-200 ease-out group-hover:translate-y-0 group-hover:opacity-100 disabled:bg-stone-500/80 pointer-coarse:hidden"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.75}
                  d={full ? CHECK_ICON : BAG_ICON}
                />
              </svg>
              {addLabel}
            </button>
            {/* Touch: a round button in the corner, always there. */}
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={full}
              aria-label={`${addLabel}: ${name}`}
              className="text-moss absolute right-3 bottom-3 z-10 hidden h-10 w-10 items-center justify-center rounded-full bg-[#fafaf8]/95 shadow-sm disabled:text-stone-400 pointer-coarse:flex"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.75}
                  d={full ? CHECK_ICON : BAG_ICON}
                />
              </svg>
            </button>
          </>
        )}
      </div>

      <div className="border border-t-0 border-stone-200 bg-[#fafaf8] px-4 py-3">
        <div className="flex items-baseline justify-between gap-3">
          <p className="group-hover:text-moss min-w-0 truncate font-serif text-sm tracking-wide text-stone-700 transition-colors">
            {name}
          </p>
          <p className="shrink-0 text-sm text-stone-700 tabular-nums">
            {product.price.toLocaleString("cs-CZ")}&nbsp;{t("currency")}
          </p>
        </div>
        <p className="mt-1 text-[0.7rem] tracking-wide whitespace-nowrap text-stone-400">
          {!inStock
            ? t("soldOut")
            : product.stockCount === 1
              ? t("lastPiece")
              : t("piecesInStock", { count: product.stockCount })}
        </p>
      </div>
    </Link>
  );
}
