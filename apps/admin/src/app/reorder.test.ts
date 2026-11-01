import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp, effectScope } from 'vue';
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
import { moveItem, useDragReorder, useListReorder } from './reorder';

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

describe('useListReorder', () => {
  const KEY = ['rows'];
  interface Row {
    id: string;
  }
  const rows: Row[] = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

  afterEach(() => vi.unstubAllGlobals());

  /** The composable inside an app that provides the query client, as a page has it. */
  function setUp(save: (ids: string[]) => Promise<unknown>) {
    // The arrows hand the focus back through the DOM, which these tests don't have.
    vi.stubGlobal('document', { querySelector: () => null });
    vi.stubGlobal('CSS', { escape: (text: string) => text });
    const queryClient = new QueryClient();
    queryClient.setQueryData(KEY, rows);
    const errors: unknown[] = [];
    const settled = vi.fn();
    const app = createApp({}).use(VueQueryPlugin, { queryClient });
    const reorder = app.runWithContext(() =>
      effectScope().run(() =>
        useListReorder<Row>({
          queryKey: KEY,
          items: () => queryClient.getQueryData<Row[]>(KEY) ?? [],
          save,
          onError: (err) => errors.push(err),
          onSettled: settled,
        })
      )
    )!;
    const shown = () => queryClient.getQueryData<Row[]>(KEY)?.map((row) => row.id);
    return { reorder, shown, errors, settled };
  }

  it('shows the new order at once and saves every id in it', async () => {
    const save = vi.fn(async () => undefined);
    const { reorder, shown, settled } = setUp(save);
    reorder.moveByArrow(0, 'forward');
    await flush();
    expect(shown()).toEqual(['b', 'a', 'c']);
    expect(save).toHaveBeenCalledWith(['b', 'a', 'c']);
    expect(settled).toHaveBeenCalled();
  });

  it('goes back to the saved order when the save fails', async () => {
    const failure = new Error('409');
    const { reorder, shown, errors } = setUp(async () => {
      throw failure;
    });
    reorder.move(2, 0);
    await flush();
    expect(shown()).toEqual(['a', 'b', 'c']);
    expect(errors).toEqual([failure]);
  });

  it('ignores a move while one is saving, and arrows past either end', async () => {
    let finish = () => undefined as void;
    const save = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    const { reorder, shown } = setUp(save);
    reorder.moveByArrow(0, 'back');
    reorder.moveByArrow(5, 'forward');
    await flush();
    expect(shown()).toEqual(['a', 'b', 'c']);
    reorder.move(0, 1);
    await flush();
    reorder.move(1, 2);
    finish();
    await flush();
    expect(save).toHaveBeenCalledTimes(1);
    expect(shown()).toEqual(['b', 'a', 'c']);
  });
});
