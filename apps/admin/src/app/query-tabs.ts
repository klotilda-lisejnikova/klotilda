import { computed } from 'vue';
import type { Ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

/** A tab of a list: its value in the address and its label. */
export interface QueryTab {
  value: string;
  label: string;
}

/** How many rows wait in some of the tabs, by tab value. */
export type TabCounts = Record<string, number> | undefined;

/** The tab a query value names; the first tab, the default, for anything else. */
export function findTab<Tab extends QueryTab>(tabs: readonly Tab[], raw: unknown): Tab {
  return tabs.find((tab) => tab.value === raw) ?? tabs[0];
}

/** The tabs as `UTabs` items, a count as the badge (none for zero or for a tab not counted). */
export function tabItems(tabs: readonly QueryTab[], counts: TabCounts) {
  return tabs.map((tab) => ({
    label: tab.label,
    value: tab.value,
    badge: counts?.[tab.value] || undefined,
  }));
}

/** The tabs as `USelect` items, for phones: the count goes into the label. */
export function tabSelectItems(tabs: readonly QueryTab[], counts: TabCounts) {
  return tabItems(tabs, counts).map((item) => ({
    value: item.value,
    label: item.badge ? `${item.label} (${item.badge})` : item.label,
  }));
}

/**
 * A list's tab kept in the address under `param`, so going back from a row returns to it. The
 * first tab is the default and leaves the address without the parameter.
 */
export function useQueryTab<Tab extends QueryTab>(
  tabs: readonly Tab[],
  param: string,
  counts: Ref<TabCounts>
) {
  const route = useRoute();
  const router = useRouter();
  const current = computed(() => findTab(tabs, route.query[param]));

  function select(value: string | number) {
    const chosen = findTab(tabs, String(value)).value;
    void router.replace({
      query: { ...route.query, [param]: chosen === tabs[0].value ? undefined : chosen },
    });
  }

  const items = computed(() => tabItems(tabs, counts.value));
  const selectItems = computed(() => tabSelectItems(tabs, counts.value));
  return { current, select, items, selectItems };
}
