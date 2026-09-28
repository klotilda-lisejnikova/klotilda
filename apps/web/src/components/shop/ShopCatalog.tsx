"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Product } from "@/services";
import { categoriesOf } from "@/lib/category";
import CategoryFilter, {
  ALL_CATEGORIES,
  type CategoryChoice,
} from "@/components/shop/CategoryFilter";
import ProductCard from "@/components/shop/ProductCard";

const CATEGORY_PARAM = "category";
/** The first row is on screen at once: its photos load first. */
const EAGER_CARDS = 4;

/** The chosen category, when the shop has something in it; otherwise every product. */
function readCategory(
  value: string | null,
  products: Product[],
): CategoryChoice {
  return value && products.some((p) => p.category?.slug === value)
    ? value
    : ALL_CATEGORIES;
}

/**
 * Switches the category in the address bar without asking the server again: the page already
 * holds every product, and `useSearchParams` follows `history.replaceState`.
 */
function selectCategory(category: CategoryChoice): void {
  const url = new URL(window.location.href);
  if (category === ALL_CATEGORIES) url.searchParams.delete(CATEGORY_PARAM);
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
    active === ALL_CATEGORIES
      ? products
      : products.filter((p) => p.category?.slug === active);

  return (
    <>
      <CategoryFilter
        categories={categoriesOf(products)}
        active={active}
        locale={locale}
        onSelect={onSelect}
      />

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
              <div className="h-px flex-1 bg-stone-300/50" />
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-6 md:gap-x-5 md:gap-y-8 lg:grid-cols-3 xl:grid-cols-4">
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
  const active = readCategory(useSearchParams().get(CATEGORY_PARAM), products);
  return (
    <CatalogView
      products={products}
      active={active}
      locale={locale}
      onSelect={selectCategory}
    />
  );
}
