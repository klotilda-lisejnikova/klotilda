/**
 * `{{name}}` placeholders in texts with slots (the admin's e-mail texts, the legal pages): filled from a
 * set of values, checked against the names a text knows. Spaces inside the braces are allowed.
 */
const PLACEHOLDER = /\{\{\s*([^{}\s]*)\s*\}\}/g;

/** `{{vs}}` and the like replaced by their values; a name without a value stays as written. */
export function fillPlaceholders(
  text: string,
  values: Readonly<Record<string, string | undefined>>
): string {
  return text.replace(PLACEHOLDER, (written, name: string) => {
    const value = Object.hasOwn(values, name) ? values[name] : undefined;
    return value ?? written;
  });
}

/** The placeholders in `text` that aren't among `known`, each once (`["cena"]`). */
export function unknownPlaceholders(text: string, known: readonly string[]): string[] {
  const names = [...text.matchAll(PLACEHOLDER)].map((match) => match[1] ?? '');
  return [...new Set(names.filter((name) => !known.includes(name)))];
}

/**
 * Whether `text` holds braces that aren't a whole placeholder (`{{vs}`, `{{cislo zasilky}}`): the
 * reader would see them as written.
 */
export function hasBrokenPlaceholder(text: string): boolean {
  return /\{\{|\}\}/.test(text.replace(PLACEHOLDER, ''));
}
