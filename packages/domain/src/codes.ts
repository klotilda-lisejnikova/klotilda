/** How long a shipping or payment method's code may be. */
export const CODE_MAX_LENGTH = 40;

/**
 * A shipping or payment method's code from its name: `"Osobní odběr"` → `"osobni-odber"`. Lower
 * case, no diacritics, letters, digits, `-` and `_` (the first shipping methods' codes have
 * underscores). Empty when nothing usable is left.
 */
export function toCode(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '')
    .slice(0, CODE_MAX_LENGTH)
    .replace(/[-_]+$/, '');
}
