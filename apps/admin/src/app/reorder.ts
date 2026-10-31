import { shallowRef } from 'vue';

/** `items` with the one at `from` moved to `to`, as a new array; out-of-range moves change nothing. */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const moved = [...items];
  if (from === to || !(from in moved) || !(to in moved)) return moved;
  const [item] = moved.splice(from, 1) as [T];
  moved.splice(to, 0, item);
  return moved;
}

/** Where a dragged item sits: its list (`group`, e.g. a gallery row) and its position in it. */
interface DragPosition<Group> {
  group: Group;
  index: number;
}

/**
 * Native drag and drop within a list: `v-bind="drag.handlers(group, index)"` on each item makes it
 * draggable, and a drop on another item of the same group calls `onMove(group, from, to)`. Touch
 * screens don't drag natively; pages keep arrow buttons for them and for the keyboard.
 */
export function useDragReorder<Group extends string | number>(
  onMove: (group: Group, from: number, to: number) => void
) {
  const dragging = shallowRef<DragPosition<Group> | null>(null);
  const target = shallowRef<DragPosition<Group> | null>(null);

  const isSame = (a: DragPosition<Group> | null, group: Group, index: number) =>
    a !== null && a.group === group && a.index === index;

  function reset() {
    dragging.value = null;
    target.value = null;
  }

  function handlers(group: Group, index: number) {
    return {
      draggable: true,
      onDragstart(event: DragEvent) {
        dragging.value = { group, index };
        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', String(index));
        }
      },
      onDragover(event: DragEvent) {
        if (dragging.value?.group !== group) return;
        event.preventDefault();
        target.value = { group, index };
      },
      onDrop(event: DragEvent) {
        event.preventDefault();
        const from = dragging.value;
        reset();
        if (from && from.group === group && from.index !== index) onMove(group, from.index, index);
      },
      onDragend: reset,
    };
  }

  return {
    handlers,
    /** The item being dragged, to dim it. */
    isDragged: (group: Group, index: number) => isSame(dragging.value, group, index),
    /** The item the dragged one would land on, to highlight it. */
    isTarget: (group: Group, index: number) =>
      isSame(target.value, group, index) && !isSame(dragging.value, group, index),
  };
}
