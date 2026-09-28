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
          // The craft chips of "O mně", with moss for the chosen one.
          className={`border px-4 py-1.5 text-[0.7rem] tracking-[0.25em] uppercase transition-colors ${
            active === category
              ? "border-moss bg-moss text-[#fafaf8]"
              : "hover:border-moss hover:text-moss border-stone-300 text-stone-500"
          }`}
        >
          {t(category)}
        </button>
      ))}
    </div>
  );
}
