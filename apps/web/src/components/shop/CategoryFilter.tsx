"use client";

import { useTranslations } from "next-intl";
import type { CategorySummary } from "@/services";
import { categoryName } from "@/lib/category";

/** A category's slug, or every product. */
export type CategoryChoice = string;
export const ALL_CATEGORIES = "all";

/** The category pills. Without `onSelect` (the server render) they show but do nothing yet. */
export default function CategoryFilter({
  categories,
  active,
  locale,
  onSelect,
}: {
  categories: CategorySummary[];
  active: CategoryChoice;
  locale: string;
  onSelect?: (category: CategoryChoice) => void;
}) {
  const t = useTranslations("shop.filters");
  const choices = [
    { slug: ALL_CATEGORIES, label: t("all") },
    ...categories.map((category) => ({
      slug: category.slug,
      label: categoryName(category, locale),
    })),
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {choices.map(({ slug, label }) => (
        <button
          key={slug}
          type="button"
          onClick={() => onSelect?.(slug)}
          aria-pressed={active === slug}
          // Square chips, moss for the chosen one.
          className={`border px-4 py-1.5 text-[0.7rem] tracking-[0.25em] uppercase transition-colors ${
            active === slug
              ? "border-moss bg-moss text-[#fafaf8]"
              : "hover:border-moss hover:text-moss border-stone-300 text-stone-500"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
