"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  PRODUCT_CATEGORIES,
  type Product,
  type ProductCategory,
} from "@/services";
import CategoryFilter, {
  type CategoryChoice,
} from "@/components/shop/CategoryFilter";
import ProductCard from "@/components/shop/ProductCard";

const CATEGORY_PARAM = "category";
/** The first row is on screen at once: its photos load first. */
const EAGER_CARDS = 4;

function readCategory(value: string | null): CategoryChoice {
  return PRODUCT_CATEGORIES.includes(value as ProductCategory)
    ? (value as ProductCategory)
    : "all";
}

/**
 * Switches the category in the address bar without asking the server again: the page already
 * holds every product, and `useSearchParams` follows `history.replaceState`.
 */
function selectCategory(category: CategoryChoice): void {
  const url = new URL(window.location.href);
  if (category === "all") url.searchParams.delete(CATEGORY_PARAM);
  else url.searchParams.set(CATEGORY_PARAM, category);
  window.history.replaceState(null, "", url);
}

/** The filter and the grid for one chosen category. Renders on the server too. */
export function CatalogView({
  products,
  active,
  locale,
  onSelect,
}: {
  products: Product[];
  active: CategoryChoice;
  locale: string;
  onSelect?: (category: CategoryChoice) => void;
}) {
  const t = useTranslations("shop");
  const shown =
    active === "all" ? products : products.filter((p) => p.category === active);

  return (
    <>
      <CategoryFilter active={active} onSelect={onSelect} />

      <div className="mt-10">
        {shown.length === 0 ? (
          <p className="py-16 text-center text-sm text-stone-400">
            {t("empty")}
          </p>
        ) : (
          <>
            <div className="mb-7 flex items-center gap-4">
              <span className="shrink-0 text-[11px] tracking-[0.22em] text-stone-400 uppercase tabular-nums">
                {t("productsCount", { count: shown.length })}
              </span>
              <div className="h-px flex-1 bg-stone-100" />
            </div>

            <div className="grid grid-cols-2 gap-6 lg:grid-cols-3 xl:grid-cols-4">
              {shown.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  locale={locale}
                  eager={index < EAGER_CARDS}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}

/** The catalogue following `?category=` in the address. */
export default function ShopCatalog({
  products,
  locale,
}: {
  products: Product[];
  locale: string;
}) {
  const active = readCategory(useSearchParams().get(CATEGORY_PARAM));
  return (
    <CatalogView
      products={products}
      active={active}
      locale={locale}
      onSelect={selectCategory}
    />
  );
}
