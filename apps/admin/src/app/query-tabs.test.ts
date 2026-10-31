import { describe, expect, it } from 'vitest';
import { findTab, tabItems, tabSelectItems } from './query-tabs';

const TABS = [
  { value: 'all', label: 'Všechny' },
  { value: 'hidden', label: 'Skryté' },
  { value: 'sold-out', label: 'Vyprodané' },
];

describe('query tabs', () => {
  it('take the tab the address names, else the first', () => {
    expect(findTab(TABS, 'hidden').value).toBe('hidden');
    expect(findTab(TABS, 'nonsense').value).toBe('all');
    expect(findTab(TABS, ['hidden', 'all']).value).toBe('all');
    expect(findTab(TABS, undefined).value).toBe('all');
  });

  it('show a count only where there is one', () => {
    const counts = { hidden: 2, 'sold-out': 0 };
    expect(tabItems(TABS, counts).map((item) => item.badge)).toEqual([undefined, 2, undefined]);
    expect(tabSelectItems(TABS, counts).map((item) => item.label)).toEqual([
      'Všechny',
      'Skryté (2)',
      'Vyprodané',
    ]);
    expect(tabItems(TABS, undefined).every((item) => item.badge === undefined)).toBe(true);
  });
});
