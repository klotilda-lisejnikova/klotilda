import { nextTick, shallowRef } from 'vue';
import { useMutation, useQueryClient } from '@tanstack/vue-query';
import type { QueryKey } from '@tanstack/vue-query';

/** `items` with the one at `from` moved to `to`, as a new array; out-of-range moves change nothing. */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const moved = [...items];
  if (from === to || !(from in moved) || !(to in moved)) return moved;
  const [item] = moved.splice(from, 1) as [T];
  moved.splice(to, 0, item);
  return moved;
}

/** Which way an arrow button moves its item: towards the start of the list or its end. */
export type MoveDirection = 'back' | 'forward';

/** The `data-move` an arrow button carries, so `focusMoveButton` finds it again after a move. */
export const moveButtonKey = (id: string, direction: MoveDirection) => `${id}:${direction}`;

/**
 * Puts the keyboard focus back on an arrow after its item moved (a moved or disabled button loses
 * it): the same arrow of the item, or its other arrow once the item reached the end of the list.
 * Call it once the list shows the new order.
 */
export async function focusMoveButton(id: string, direction: MoveDirection) {
  await nextTick();
  const find = (way: MoveDirection) =>
    document.querySelector<HTMLButtonElement>(
      `[data-move="${CSS.escape(moveButtonKey(id, way))}"]`
    );
  const same = find(direction);
  (same && !same.disabled ? same : find(direction === 'back' ? 'forward' : 'back'))?.focus();
}

/** Where a dragged item sits: its list (`group`, e.g. a gallery row) and its position in it. */
interface DragPosition<Group> {
  group: Group;
  index: number;
}

/**
 * Native drag and drop within a list: `v-bind="drag.handlers(group, index)"` on each item makes it
 * draggable, and a drop on another item of the same group calls `onMove(group, from, to)`. To drag
 * by a handle only (so the item's text stays selectable), bind `drag.target(…)` on the item, marked
 * `data-drag-item`, and `drag.source(…)` on the handle. Touch screens don't drag natively; pages
 * keep arrow buttons for them and for the keyboard.
 */
export function useDragReorder<Group extends string | number>(
  onMove: (group: Group, from: number, to: number) => void
) {
  const dragging = shallowRef<DragPosition<Group> | null>(null);
  const landing = shallowRef<DragPosition<Group> | null>(null);

  const isSame = (a: DragPosition<Group> | null, group: Group, index: number) =>
    a !== null && a.group === group && a.index === index;

  function reset() {
    dragging.value = null;
    landing.value = null;
  }

  function source(group: Group, index: number) {
    return {
      draggable: true,
      onDragstart(event: DragEvent) {
        dragging.value = { group, index };
        if (!event.dataTransfer) return;
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', String(index));
        const handle = event.currentTarget as HTMLElement | null;
        const item = handle?.closest<HTMLElement>('[data-drag-item]');
        if (item && item !== handle) event.dataTransfer.setDragImage(item, 0, 0);
      },
      onDragend: reset,
    };
  }

  function target(group: Group, index: number) {
    return {
      onDragover(event: DragEvent) {
        if (dragging.value?.group !== group) return;
        event.preventDefault();
        landing.value = { group, index };
      },
      onDrop(event: DragEvent) {
        event.preventDefault();
        const from = dragging.value;
        reset();
        if (from && from.group === group && from.index !== index) onMove(group, from.index, index);
      },
    };
  }

  return {
    source,
    target,
    handlers: (group: Group, index: number) => ({
      ...source(group, index),
      ...target(group, index),
    }),
    /** The item being dragged, to dim it. */
    isDragged: (group: Group, index: number) => isSame(dragging.value, group, index),
    /** The item the dragged one would land on, to highlight it. */
    isTarget: (group: Group, index: number) =>
      isSame(landing.value, group, index) && !isSame(dragging.value, group, index),
  };
}

export interface ListReorderOptions<T extends { id: string }> {
  /** The query holding the whole list, in its order. */
  queryKey: QueryKey;
  /** The list as shown now. */
  items: () => readonly T[];
  /** Saves the new order, every id once (the API's `reorder`). */
  save: (ids: string[]) => Promise<unknown>;
  onError: (err: unknown) => void;
  /** After the save, either way: reload what depends on the order. */
  onSettled: () => void;
}

interface Reorder<T> {
  ordered: T[];
  /** An arrow's move: its button gets the focus back. */
  arrow?: { id: string; direction: MoveDirection };
}

/**
 * Reordering a whole list saved at once (the categories, the shipping and payment methods): the
 * list shows the new order before the answer and goes back to the saved one if the save fails. A
 * move while one is saving, or one that goes nowhere, is ignored. `move` suits `useDragReorder`,
 * `moveByArrow` the arrows.
 */
export function useListReorder<T extends { id: string }>(options: ListReorderOptions<T>) {
  const queryClient = useQueryClient();
  const { queryKey } = options;

  const reorder = useMutation({
    mutationFn: ({ ordered }: Reorder<T>) => options.save(ordered.map((item) => item.id)),
    onMutate: async ({ ordered, arrow }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<T[]>(queryKey);
      queryClient.setQueryData<T[]>(queryKey, ordered);
      if (arrow) void focusMoveButton(arrow.id, arrow.direction);
      return { previous };
    },
    onError: (err, _reorder, context) => {
      queryClient.setQueryData(queryKey, context?.previous);
      options.onError(err);
    },
    onSettled: () => options.onSettled(),
  });

  function move(from: number, to: number, arrow?: Reorder<T>['arrow']) {
    const items = options.items();
    if (reorder.isPending.value || from === to || !(from in items) || !(to in items)) return;
    reorder.mutate({ ordered: moveItem(items, from, to), arrow });
  }

  function moveByArrow(index: number, direction: MoveDirection) {
    const item = options.items()[index];
    if (!item) return;
    move(index, direction === 'back' ? index - 1 : index + 1, { id: item.id, direction });
  }

  return { move, moveByArrow };
}
