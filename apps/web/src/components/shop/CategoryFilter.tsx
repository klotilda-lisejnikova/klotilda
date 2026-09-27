"use client";

import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { ProductCategory } from "@/services";

const CATEGORIES: Array<ProductCategory | "all"> = [
  "all",
  "keramika",
  "vysivka",
  "linoryt",
];

export default function CategoryFilter() {
  const t = useTranslations("shop.filters");
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = (searchParams.get("category") ?? "all") as
    | ProductCategory
    | "all";

  const setCategory = useCallback(
    (cat: ProductCategory | "all") => {
      const params = new URLSearchParams(searchParams.toString());
      if (cat === "all") {
        params.delete("category");
      } else {
        params.set("category", cat);
      }
      router.push(`?${params.toString()}`);
    },
    [router, searchParams],
  );

  return (
    <div className="flex flex-wrap gap-2">
      {CATEGORIES.map((cat) => (
        <button
          key={cat}
          onClick={() => setCategory(cat)}
          className={`rounded-full px-4 py-1.5 text-sm tracking-wide transition-colors ${
            active === cat
              ? "bg-stone-800 text-white"
              : "border border-stone-300 text-stone-600 hover:border-stone-500"
          }`}
        >
          {t(cat)}
        </button>
      ))}
    </div>
  );
}
