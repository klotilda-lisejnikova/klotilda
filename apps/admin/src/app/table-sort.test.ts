import { describe, expect, it } from 'vitest';
import { useTableSort } from './table-sort';

describe('useTableSort', () => {
  it('sorts by a column ascending, then descending, then goes back to the default', () => {
    const { sortParam, toggleSort } = useTableSort<'createdAt' | 'price'>('createdAt');
    expect(sortParam.value).toBe('-createdAt');
    toggleSort('price');
    expect(sortParam.value).toBe('price');
    toggleSort('price');
    expect(sortParam.value).toBe('-price');
    toggleSort('price');
    expect(sortParam.value).toBe('-createdAt');
  });

  it('turns the default column oldest first, and back', () => {
    const { sortParam, toggleSort } = useTableSort<'createdAt' | 'price'>('createdAt');
    toggleSort('createdAt');
    expect(sortParam.value).toBe('createdAt');
    toggleSort('createdAt');
    expect(sortParam.value).toBe('-createdAt');
  });
});
