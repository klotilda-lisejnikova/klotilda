const CZK = new Intl.NumberFormat('cs-CZ', {
  style: 'currency',
  currency: 'CZK',
  maximumFractionDigits: 0,
});
const DATE_TIME = new Intl.DateTimeFormat('cs-CZ', { dateStyle: 'medium', timeStyle: 'short' });

export const formatCzk = (amount: number) => CZK.format(amount);
export const formatDateTime = (value: string | Date) => DATE_TIME.format(new Date(value));

/** Czech plural: 1 objednávka, 2–4 objednávky, 0 or 5+ objednávek. */
export function plural(count: number, one: string, few: string, many: string): string {
  const word = count === 1 ? one : count >= 2 && count <= 4 ? few : many;
  return `${count} ${word}`;
}

/** "v září", "v říjnu": the month for "Zaplaceno v …". */
const MONTHS_LOCATIVE = [
  'lednu',
  'únoru',
  'březnu',
  'dubnu',
  'květnu',
  'červnu',
  'červenci',
  'srpnu',
  'září',
  'říjnu',
  'listopadu',
  'prosinci',
];
export const inMonth = (date: Date) => `v ${MONTHS_LOCATIVE[date.getMonth()]}`;
