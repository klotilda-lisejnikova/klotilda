import type { CategorySummary } from "@/services";

/** The category's name in the page's language; Czech when it has no English one. */
export function categoryName(
  category: CategorySummary,
  locale: string,
): string {
  return locale === "en" && category.name_en
    ? category.name_en
    : category.name_cs;
}

/**
 * The categories the given products are in, in the admin's order: the shop's filter offers only
 * what has something on offer.
 */
export function categoriesOf(
  rows: { category: CategorySummary | null }[],
): CategorySummary[] {
  const byId = new Map<string, CategorySummary>();
  for (const { category } of rows)
    if (category) byId.set(category.id, category);
  return [...byId.values()].sort(
    (a, b) =>
      (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
      a.name_cs.localeCompare(b.name_cs, "cs"),
  );
}
