import { ValidationError } from '@eleansphere/be-core';
import type { CrudHook, ModelRouteOverrides } from '@eleansphere/be-core';
import { categoryEntity, toSlug } from '@klotilda/domain';
import type { CategorySummary } from '@klotilda/domain';
import type { ModelRegistry } from '../models-registry';

type Enrich = NonNullable<ModelRouteOverrides['enrich']>;
type Row = Record<string, unknown>;

const CATEGORY_ID = 'categoryId';
const CATEGORY_KEY = 'category';
const SUMMARY_FIELDS = ['id', 'slug', 'name_cs', 'name_en', 'sortOrder'] as const;

/**
 * `routes.Category.hooks`: the slug is stored normalized (`Keramika 2` → `keramika-2`), so the
 * shop address stays plain. One with nothing usable left is refused.
 */
export const normalizeSlug: CrudHook = async (data) => {
  if (data.slug === undefined) return data;
  const slug = toSlug(String(data.slug));
  if (!slug) throw new ValidationError([{ path: 'slug', code: 'format' }]);
  return { ...data, slug };
};

/**
 * Wraps a row's `enrich` so every product or gallery picture the API returns also carries its
 * `category` (`CategorySummary`, or `null`) — one query for the whole page of rows.
 */
export function withCategory(registry: ModelRegistry, enrich: Enrich): Enrich {
  return async (rows) => {
    const records = await enrich(rows);
    const ids = [...new Set(records.map((row) => row[CATEGORY_ID]).filter(Boolean))];
    const categories = ids.length
      ? await registry.get(categoryEntity.config.name).findAll({
          where: { id: ids },
          attributes: [...SUMMARY_FIELDS],
        })
      : [];
    const byId = new Map(
      categories.map((category) => {
        const summary = category.toJSON() as CategorySummary;
        return [summary.id, summary];
      })
    );
    return records.map((row): Row => ({
      ...row,
      [CATEGORY_KEY]: byId.get(row[CATEGORY_ID] as string) ?? null,
    }));
  };
}
