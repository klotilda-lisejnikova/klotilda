"use client";

import { useState } from "react";
import { mediaUrl } from "@/lib/media-url";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { Product } from "@/services";
import { maxQuantity, useCart, useCartStore } from "@/store/cart.store";

interface Props {
  product: Product;
  locale: string;
  /** On screen at once (the first row): its photo loads before the rest. */
  eager?: boolean;
}

/** The grid is 2 columns, 3 from `lg`, 4 from `xl` inside a 1152px container. */
const CARD_SIZES = "(min-width: 1280px) 270px, (min-width: 1024px) 33vw, 50vw";

export default function ProductCard({ product, locale, eager = false }: Props) {
  const t = useTranslations("shop");
  const tPhotos = useTranslations("lightbox");
  const [loaded, setLoaded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [failed, setFailed] = useState<Set<string>>(new Set());
  const addItem = useCartStore((state) => state.addItem);
  const cartLine = useCart().find((i) => i.productId === product.id);

  const name =
    locale === "en" && product.name_en ? product.name_en : product.name_cs;
  const inStock = product.stockCount > 0;
  // "In the cart" once there is no piece left to add.
  const inCart = !!cartLine && cartLine.quantity >= maxQuantity(product);
  const available = product.images.filter((img) => !failed.has(img.id));
  const activeImage = available[activeIndex] ?? available[0];

  const markFailed = (id: string) => setFailed((p) => new Set([...p, id]));

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (inStock && !inCart) addItem(product);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveIndex((p) => Math.max(0, p - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveIndex((p) => Math.min(available.length - 1, p + 1));
  };

  return (
    <Link href={`/shop/${product.id}`} className="group block">
      <div className="overflow-hidden rounded-sm bg-white shadow-sm ring-1 ring-stone-100 transition-shadow duration-300 group-hover:shadow-md group-hover:ring-stone-200">
        {/* ── Image ── */}
        <div
          className="relative aspect-square overflow-hidden bg-stone-50"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => {
            setHovered(false);
            setActiveIndex(0);
          }}
        >
          {(!loaded || available.length === 0) && (
            <div className="absolute inset-0 animate-pulse bg-stone-100" />
          )}

          {available.map((img, i) => {
            if (i > 0 && !hovered) return null;
            return (
              <Image
                key={img.id}
                src={mediaUrl(img.url)}
                alt={name}
                fill
                sizes={CARD_SIZES}
                priority={eager && i === 0}
                className={`object-cover transition-all duration-500 group-hover:scale-[1.03] ${
                  activeImage?.id === img.id ? "opacity-100" : "opacity-0"
                }`}
                onLoad={i === 0 ? () => setLoaded(true) : undefined}
                onError={() => markFailed(img.id)}
              />
            );
          })}

          {/* Sold-out overlay */}
          {!inStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-stone-900/35">
              <span className="bg-white/90 px-3 py-1 text-xs tracking-widest text-stone-700 uppercase backdrop-blur-sm">
                {t("soldOut")}
              </span>
            </div>
          )}

          {/* Arrow navigation */}
          {available.length > 1 && (
            <>
              <button
                aria-label={tPhotos("previous")}
                disabled={activeIndex === 0}
                onClick={handlePrev}
                className={`absolute top-1/2 left-2 -translate-y-1/2 rounded-full bg-black/25 p-1 text-white backdrop-blur-sm transition-opacity duration-200 disabled:opacity-20 pointer-coarse:hidden ${
                  hovered ? "opacity-100" : "opacity-0"
                }`}
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
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <button
                aria-label={tPhotos("next")}
                disabled={activeIndex === available.length - 1}
                onClick={handleNext}
                className={`absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-black/25 p-1 text-white backdrop-blur-sm transition-opacity duration-200 disabled:opacity-20 pointer-coarse:hidden ${
                  hovered ? "opacity-100" : "opacity-0"
                }`}
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
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </>
          )}

          {/* Image dots — sit just above the add-to-cart strip when in stock */}
          {available.length > 1 && (
            <div
              className={`absolute left-1/2 flex -translate-x-1/2 gap-1.5 transition-all duration-200 pointer-coarse:opacity-100 ${
                hovered ? "opacity-100" : "opacity-0"
              }`}
              style={{ bottom: inStock ? "3rem" : "0.75rem" }}
            >
              {available.map((_, i) => (
                <span
                  key={i}
                  className={`block h-1 w-1 rounded-full transition-colors ${
                    i === activeIndex ? "bg-white" : "bg-white/50"
                  }`}
                />
              ))}
            </div>
          )}

          {/* Quick add-to-cart — slides up from bottom on hover */}
          {inStock && (
            <div
              className={`absolute inset-x-0 bottom-0 transition-all duration-200 ease-out pointer-coarse:translate-y-0 pointer-coarse:opacity-100 ${
                hovered
                  ? "translate-y-0 opacity-100"
                  : "translate-y-full opacity-0"
              }`}
            >
              <button
                onClick={handleAddToCart}
                disabled={inCart}
                className={`flex w-full items-center justify-center gap-2 py-2.5 text-xs font-medium tracking-wider uppercase backdrop-blur-sm transition-colors ${
                  inCart
                    ? "cursor-default bg-stone-700/90 text-white/60"
                    : "bg-stone-800/90 text-white hover:bg-stone-900 active:bg-stone-950"
                }`}
              >
                {inCart ? (
                  <>
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {t("inCart")}
                  </>
                ) : (
                  <>
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
                        d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                      />
                    </svg>
                    {cartLine ? t("addAnotherShort") : t("addShort")}
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* ── Info ── */}
        <div className="flex items-start justify-between gap-2 p-3 pb-3.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <p className="truncate text-sm font-medium text-stone-800 transition-colors group-hover:text-stone-600">
                {name}
              </p>
              <svg
                className={`h-3.5 w-3.5 shrink-0 text-stone-400 transition-all duration-200 ${
                  hovered ? "translate-x-0.5 opacity-100" : "opacity-0"
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>

            {/* Stock status */}
            <div className="mt-1">
              {inStock ? (
                <span className="inline-flex items-center gap-1.5 text-xs whitespace-nowrap text-emerald-600">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                  {t("inStock")}
                  <span className="text-emerald-500/70">
                    · {t("piecesShort", { count: product.stockCount })}
                  </span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs text-rose-500">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
                  {t("soldOut")}
                </span>
              )}
            </div>
          </div>

          <p className="shrink-0 text-sm font-semibold text-stone-800 tabular-nums">
            {product.price.toLocaleString("cs-CZ")}&nbsp;{t("currency")}
          </p>
        </div>
      </div>
    </Link>
  );
}
