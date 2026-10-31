/** Form state may hold `''` for an emptied optional text; the API stores nothing there. */
export function emptyToNull<T extends Record<string, unknown>>(values: T): T {
  return Object.fromEntries(
    Object.entries(values).map(([name, value]) => [name, value === '' ? null : value])
  ) as T;
}

/** `null` from the API as `''` for a text input. */
export function nullToEmpty<T extends Record<string, string | null | undefined>>(
  values: T
): { [Name in keyof T]: string } {
  return Object.fromEntries(Object.entries(values).map(([name, value]) => [name, value ?? ''])) as {
    [Name in keyof T]: string;
  };
}

/** Only the named fields of `values`: an update sends what the admin changed, nothing else. */
export function pick<T extends object>(values: T, names: readonly (keyof T)[]): Partial<T> {
  return Object.fromEntries(names.map((name) => [name, values[name]])) as Partial<T>;
}
