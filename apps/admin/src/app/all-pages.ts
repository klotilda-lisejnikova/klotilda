/** The largest page the API serves (`maxLimit` of the entities read whole). */
export const LARGEST_PAGE = 200;

/**
 * Every row of a list, page by page until `total` rows are in or a page brings nothing new (an
 * empty page, or a server that ignores the page). Ask for a sort under which new rows come last,
 * so a row added meanwhile shifts no page; a row that lands in two pages anyway is kept once. A row
 * that leaves the list between two pages still shifts the rest: one row can be missed until the
 * next fetch.
 */
export async function fetchAllPages<Row extends { id: string }>(
  fetchPage: (page: number, limit: number) => Promise<{ data: Row[]; total: number }>
): Promise<Row[]> {
  const rows = new Map<string, Row>();
  for (let page = 1; ; page++) {
    const { data, total } = await fetchPage(page, LARGEST_PAGE);
    const before = rows.size;
    for (const row of data) rows.set(row.id, row);
    if (rows.size >= total || rows.size === before) return [...rows.values()];
  }
}
