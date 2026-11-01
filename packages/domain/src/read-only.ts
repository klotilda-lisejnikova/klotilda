import type { Fields } from '@eleansphere/entity-core';

export type ReadOnlyFields<T extends Fields> = {
  [K in keyof T]: T[K] & { readonly readOnly: true };
};

/** The same fields, each marked `readOnly`: stored as sent, never changed through the CRUD routes. */
export function asReadOnly<T extends Fields>(fields: T): ReadOnlyFields<T> {
  return Object.fromEntries(
    Object.entries(fields).map(([name, field]) => [name, { ...field, readOnly: true }])
  ) as ReadOnlyFields<T>;
}
