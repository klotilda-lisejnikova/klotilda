import type { RequestHandler } from 'express';
import {
  CATEGORIES_PATH,
  CHECKOUT_PATH,
  GALLERY_PATH,
  LEGAL_DOCUMENTS_PATH,
  ORDERS_PATH,
  PRODUCTS_PATH,
  SELLER_PATH,
} from '@klotilda/domain';

/** The website's `POST /api/revalidate` and the secret it checks. */
export interface WebRevalidation {
  url: string;
  secret: string;
}

/** Several saves in a row (a product, then its photos) rebuild the site once. */
const DEBOUNCE_MS = 1000;
const FILES_PATH = '/api/files';

/**
 * Requests that change what the website shows: the catalogue and the gallery, their photos, the
 * seller's details, a published legal text, a placed order (stock goes down) and order actions (a
 * cancelled order's stock comes back). A legal draft's saves don't: the website never shows one.
 */
function changesTheWebsite(method: string, path: string): boolean {
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return false;
  return (
    [PRODUCTS_PATH, CATEGORIES_PATH, GALLERY_PATH, FILES_PATH, CHECKOUT_PATH, SELLER_PATH].some(
      (prefix) => path === prefix || path.startsWith(`${prefix}/`)
    ) ||
    (path.startsWith(`${ORDERS_PATH}/`) && path.includes('/actions/')) ||
    (path.startsWith(`${LEGAL_DOCUMENTS_PATH}/`) && path.endsWith('/draft/publish'))
  );
}

/**
 * Global middleware: once such a request succeeds, the website is told to rebuild its cached
 * pages, so the admin's changes show at once. Without `revalidation` it does nothing (locally,
 * tests); a failed call is only logged — the pages then catch up when their own `revalidate`
 * interval runs out.
 */
export function createWebRevalidator(revalidation: WebRevalidation | undefined): RequestHandler {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const revalidate = async () => {
    if (!revalidation) return;
    try {
      const response = await fetch(revalidation.url, {
        method: 'POST',
        headers: { authorization: `Bearer ${revalidation.secret}` },
      });
      if (!response.ok) console.error(`Website revalidation answered ${response.status}`);
    } catch (err) {
      console.error('Website revalidation failed:', err);
    }
  };

  return (req, res, next) => {
    if (revalidation && changesTheWebsite(req.method, req.path)) {
      res.on('finish', () => {
        if (res.statusCode >= 400) return;
        clearTimeout(timer);
        timer = setTimeout(() => void revalidate(), DEBOUNCE_MS);
        timer.unref();
      });
    }
    next();
  };
}
