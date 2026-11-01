import { describe, expect, it, vi } from 'vitest';
import { fetchAllPages, LARGEST_PAGE } from './all-pages';

const rows = (from: number, count: number) =>
  Array.from({ length: count }, (_, index) => ({ id: `row${from + index}` }));

/** A server holding `total` rows that serves at most `served` of them a page. */
const server = (total: number, served: number) =>
  vi.fn(async (page: number) => ({
    data: rows((page - 1) * served, Math.max(0, Math.min(served, total - (page - 1) * served))),
    total,
  }));

describe('fetchAllPages', () => {
  it('asks page after page until the total is in', async () => {
    const total = LARGEST_PAGE * 2 + 3;
    const fetchPage = server(total, LARGEST_PAGE);
    expect(await fetchAllPages(fetchPage)).toHaveLength(total);
    expect(fetchPage.mock.calls).toEqual([
      [1, LARGEST_PAGE],
      [2, LARGEST_PAGE],
      [3, LARGEST_PAGE],
    ]);
  });

  it('keeps going when the server serves smaller pages than asked for', async () => {
    const fetchPage = server(25, 10);
    expect(await fetchAllPages(fetchPage)).toHaveLength(25);
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });

  it('keeps a row that two pages share once, and stops at an empty page', async () => {
    const pages = [rows(0, LARGEST_PAGE), rows(LARGEST_PAGE - 1, 2), []];
    const fetchPage = vi.fn(async (page: number) => ({ data: pages[page - 1], total: 1000 }));
    expect(await fetchAllPages(fetchPage)).toHaveLength(LARGEST_PAGE + 1);
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });

  it('stops when a page brings nothing new, as from a server ignoring the page', async () => {
    const fetchPage = vi.fn(async () => ({ data: rows(0, 5), total: 50 }));
    expect(await fetchAllPages(fetchPage)).toHaveLength(5);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });
});
