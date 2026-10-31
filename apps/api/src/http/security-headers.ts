import type { RequestHandler } from 'express';

/**
 * What every answer of the API carries. The API answers JSON and photos, never a page, so nothing
 * it serves may run scripts, be framed or be sniffed into another type: a file opened directly
 * (`/api/files/:id`) stays inert whatever was uploaded.
 */
export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
};

/** Global middleware: sets `SECURITY_HEADERS` and drops Express's `X-Powered-By`. */
export const securityHeaders: RequestHandler = (_req, res, next) => {
  res.removeHeader('X-Powered-By');
  res.set(SECURITY_HEADERS);
  next();
};
