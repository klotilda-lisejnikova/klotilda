/** Form state may hold `''` for an emptied optional text; the API stores nothing there. */
export function emptyToNull<T extends Record<string, unknown>>(values: T): T {
  return Object.fromEntries(
    Object.entries(values).map(([name, value]) => [name, value === '' ? null : value])
  ) as T;
}

/** `null` from the API as `''` for a text input. */
export function nullToEmpty<T extends Record<string, unknown>>(values: T): T {
  return Object.fromEntries(
    Object.entries(values).map(([name, value]) => [name, value ?? ''])
  ) as T;
}
