import { describe, expect, it } from 'vitest';
import { moveItem, useDragReorder } from './reorder';

describe('moveItem', () => {
  it('moves an item forward and back', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveItem(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('leaves the list alone for a move outside it, and never changes the original', () => {
    const items = ['a', 'b'];
    expect(moveItem(items, 0, 2)).toEqual(['a', 'b']);
    expect(moveItem(items, -1, 0)).toEqual(['a', 'b']);
    expect(moveItem(items, 1, 0)).toEqual(['b', 'a']);
    expect(items).toEqual(['a', 'b']);
  });
});

describe('useDragReorder', () => {
  const event = () => ({ preventDefault: () => undefined }) as DragEvent;

  it('moves within a group and ignores a drop on another group', () => {
    const moves: unknown[] = [];
    const drag = useDragReorder((group, from, to) => moves.push([group, from, to]));

    drag.handlers(1, 0).onDragstart(event());
    drag.handlers(1, 2).onDragover(event());
    expect(drag.isDragged(1, 0)).toBe(true);
    expect(drag.isTarget(1, 2)).toBe(true);
    drag.handlers(1, 2).onDrop(event());
    expect(moves).toEqual([[1, 0, 2]]);
    expect(drag.isDragged(1, 0)).toBe(false);

    drag.handlers(1, 0).onDragstart(event());
    drag.handlers(2, 1).onDragover(event());
    expect(drag.isTarget(2, 1)).toBe(false);
    drag.handlers(2, 1).onDrop(event());
    expect(moves).toHaveLength(1);
  });
});
