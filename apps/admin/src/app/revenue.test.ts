import { describe, expect, it } from 'vitest';
import { axisTicks, lastMonths, revenueByMonth } from './revenue';

const order = (createdAt: Date, totalAmount: number) => ({
  createdAt: createdAt.toISOString(),
  totalAmount,
});

describe('lastMonths', () => {
  it('ends with the current month and crosses the year', () => {
    const months = lastMonths(new Date(2026, 1, 20, 15), 4);
    expect(months).toEqual([
      new Date(2025, 10, 1),
      new Date(2025, 11, 1),
      new Date(2026, 0, 1),
      new Date(2026, 1, 1),
    ]);
  });
});

describe('revenueByMonth', () => {
  const months = lastMonths(new Date(2026, 9, 31), 3);

  it('sums each month and leaves the others out', () => {
    const totals = revenueByMonth(
      [
        order(new Date(2026, 9, 1, 0, 30), 500),
        order(new Date(2026, 9, 31, 23, 59), 250),
        order(new Date(2026, 6, 31, 23, 59), 1000),
        order(new Date(2026, 8, 30, 23, 59, 59), 99),
      ],
      months
    );
    expect(totals.map(({ revenue, orders }) => [revenue, orders])).toEqual([
      [0, 0],
      [99, 1],
      [750, 2],
    ]);
    expect(totals.map(({ start }) => start)).toEqual(months);
  });
});

describe('axisTicks', () => {
  it('takes round steps from 0 up past the highest value', () => {
    expect(axisTicks(600)).toEqual([0, 200, 400, 600]);
    expect(axisTicks(601)).toEqual([0, 200, 400, 600, 800]);
    expect(axisTicks(12_400)).toEqual([0, 5000, 10_000, 15_000]);
    expect(axisTicks(37)).toEqual([0, 10, 20, 30, 40]);
  });

  it('is only the baseline when there is nothing', () => {
    expect(axisTicks(0)).toEqual([0]);
  });
});
