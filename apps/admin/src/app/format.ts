const CZK = new Intl.NumberFormat('cs-CZ', {
  style: 'currency',
  currency: 'CZK',
  maximumFractionDigits: 0,
});
const DATE_TIME = new Intl.DateTimeFormat('cs-CZ', { dateStyle: 'medium', timeStyle: 'short' });

export const formatCzk = (amount: number) => CZK.format(amount);
export const formatDateTime = (value: string | Date) => DATE_TIME.format(new Date(value));
