import { ApiError } from '@eleansphere/entity-core';

const CONFLICT = 409;

/** What went wrong, for a toast. */
export function describeError(err: unknown): string {
  if (!(err instanceof ApiError)) return 'Nepovedlo se spojit se serverem. Zkuste to znovu.';
  if (err.isAuthError) return 'Přihlášení vypršelo. Přihlaste se prosím znovu.';
  if (err.status === CONFLICT) return err.message;
  if (err.issues?.length) return 'Zkontrolujte prosím vyplněné údaje.';
  return 'Něco se pokazilo. Zkuste to prosím znovu.';
}
