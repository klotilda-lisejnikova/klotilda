import { nextTick } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useStoredChoice } from './stored-choice';

const KEY = 'test.view';
const VIEWS = ['table', 'cards'] as const;

function fakeStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    values,
  };
}

describe('useStoredChoice', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts from the stored choice and remembers a new one', async () => {
    const storage = fakeStorage({ [KEY]: 'cards' });
    vi.stubGlobal('localStorage', storage);
    const view = useStoredChoice(KEY, VIEWS, 'table');
    expect(view.value).toBe('cards');
    view.value = 'table';
    await nextTick();
    expect(storage.values.get(KEY)).toBe('table');
  });

  it('falls back when the stored value is not offered or storage is blocked', () => {
    vi.stubGlobal('localStorage', fakeStorage({ [KEY]: 'list' }));
    expect(useStoredChoice(KEY, VIEWS, 'table').value).toBe('table');
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
    });
    expect(useStoredChoice(KEY, VIEWS, 'table').value).toBe('table');
  });
});
