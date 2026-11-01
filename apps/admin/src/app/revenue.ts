import type { Order } from '@klotilda/domain';

/** How many months the overview's revenue chart covers, the current one last. */
export const REVENUE_MONTHS = 12;

export interface MonthRevenue {
  /** The month's first day, local time. */
  start: Date;
  /** CZK, shipping included. */
  revenue: number;
  orders: number;
}

/** The first day of each of the `count` months up to the one `now` falls in, oldest first. */
export function lastMonths(now: Date, count: number): Date[] {
  return Array.from(
    { length: count },
    (_, index) => new Date(now.getFullYear(), now.getMonth() - (count - 1 - index), 1)
  );
}

const monthKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}`;

/**
 * Orders summed by the month (local time) they were placed in, one entry for each of `months`;
 * orders from any other month are left out.
 */
export function revenueByMonth(
  orders: Pick<Order, 'createdAt' | 'totalAmount'>[],
  months: Date[]
): MonthRevenue[] {
  const byMonth = new Map(
    months.map((start) => [monthKey(start), { start, revenue: 0, orders: 0 }])
  );
  for (const order of orders) {
    const month = byMonth.get(monthKey(new Date(order.createdAt)));
    if (!month) continue;
    month.revenue += order.totalAmount;
    month.orders += 1;
  }
  return [...byMonth.values()];
}

const NICE_STEPS = [1, 2, 5, 10];

/**
 * An axis from 0 in round steps (1, 2 or 5 × 10ⁿ), at most `count` of them, the last at or above
 * `max`. Only 0 when there is nothing to show.
 */
export function axisTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0];
  const rough = max / count;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = NICE_STEPS.map((factor) => factor * magnitude).find((size) => size >= rough)!;
  const steps = Math.ceil(max / step);
  return Array.from({ length: steps + 1 }, (_, index) => index * step);
}
