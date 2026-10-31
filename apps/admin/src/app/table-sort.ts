import { computed, shallowRef } from 'vue';

/** A sorted column as `UTable` takes it. */
export interface SortState<Column extends string> {
  id: Column;
  desc: boolean;
}

/**
 * One column sorted at a time, by the API (`-createdAt`, `price`, …). A first click on a header
 * sorts by it ascending, the default column newest first; a second click reverses that; a third
 * goes back to the default.
 */
export function useTableSort<Column extends string>(defaultColumn: Column) {
  const sorting = shallowRef<SortState<Column>[]>([{ id: defaultColumn, desc: true }]);

  /** The list request's `sort`. */
  const sortParam = computed(() => {
    const [first] = sorting.value;
    return first ? (`${first.desc ? '-' : ''}${first.id}` as Column | `-${Column}`) : undefined;
  });

  function toggleSort(id: Column) {
    const [current] = sorting.value;
    const firstDesc = id === defaultColumn;
    if (current?.id !== id) sorting.value = [{ id, desc: firstDesc }];
    else if (current.desc === firstDesc) sorting.value = [{ id, desc: !current.desc }];
    else sorting.value = [{ id: defaultColumn, desc: true }];
  }

  function sortIcon(id: Column): string {
    const [current] = sorting.value;
    if (current?.id !== id) return 'i-lucide-arrow-up-down';
    return current.desc ? 'i-lucide-arrow-down-wide-narrow' : 'i-lucide-arrow-up-narrow-wide';
  }

  return { sorting, sortParam, toggleSort, sortIcon };
}
