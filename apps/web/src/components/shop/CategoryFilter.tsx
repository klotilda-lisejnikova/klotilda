"use client";

import { useTranslations } from "next-intl";
import { PRODUCT_CATEGORIES, type ProductCategory } from "@/services";

export type CategoryChoice = ProductCategory | "all";

const CATEGORIES: CategoryChoice[] = ["all", ...PRODUCT_CATEGORIES];

/** The category pills. Without `onSelect` (the server render) they show but do nothing yet. */
export default function CategoryFilter({
  active,
  onSelect,
}: {
  active: CategoryChoice;
  onSelect?: (category: CategoryChoice) => void;
}) {
  const t = useTranslations("shop.filters");

  return (
    <div className="flex flex-wrap gap-2">
      {CATEGORIES.map((category) => (
        <button
          key={category}
          type="button"
          onClick={() => onSelect?.(category)}
          aria-pressed={active === category}
          className={`rounded-full px-4 py-1.5 text-sm tracking-wide transition-colors ${
            active === category
              ? "bg-stone-800 text-white"
              : "border border-stone-300 text-stone-600 hover:border-stone-500"
          }`}
        >
          {t(category)}
        </button>
      ))}
    </div>
  );
}
