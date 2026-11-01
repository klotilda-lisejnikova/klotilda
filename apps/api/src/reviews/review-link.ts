import crypto from 'node:crypto';
import { REVIEW_LINK_LIFETIME_DAYS, REVIEW_WRITE_PATH } from '@klotilda/domain';

const DAY_MS = 24 * 60 * 60 * 1000;
const SECOND_MS = 1000;
const SEPARATOR = '.';
/**
 * The links are signed with a key of their own, derived from `JWT_SECRET`, so no token the API
 * signs for one purpose (a session) is ever valid for the other. Changing `JWT_SECRET` ends the
 * links already sent.
 */
const KEY_LABEL = 'klotilda/review-link/v1';
/** What an order id may hold: anything but the separator, so the token splits back unambiguously. */
const ORDER_ID = /^[A-Za-z0-9_-]+$/;
const EXPIRY = /^\d+$/;

/** Who a valid link lets write a review, and until when. */
export interface ReviewLink {
  orderId: string;
  expiresAt: Date;
}

/** A link to write the review: the website's page with the token, and when it ends. */
export interface ReviewLinkUrl {
  url: string;
  expiresAt: Date;
}

function signingKey(jwtSecret: string): Buffer {
  return crypto.createHmac('sha256', jwtSecret).update(KEY_LABEL).digest();
}

function signature(key: Buffer, payload: string): string {
  return crypto.createHmac('sha256', key).update(payload).digest('base64url');
}

/** When a link made `now` ends, to the second (the token carries Unix seconds). */
export function reviewLinkExpiry(now: Date): Date {
  const expires = now.getTime() + REVIEW_LINK_LIFETIME_DAYS * DAY_MS;
  return new Date(Math.floor(expires / SECOND_MS) * SECOND_MS);
}

/**
 * `ord….1798761600.<signature>`: the order, when the link ends (Unix seconds), signed. Throws for
 * an id the token couldn't carry, so no e-mail ever offers a link the API would refuse.
 */
export function createReviewToken(jwtSecret: string, orderId: string, now: Date): string {
  if (!ORDER_ID.test(orderId)) throw new Error(`Order id "${orderId}" can't go into a review link`);
  const expires = reviewLinkExpiry(now).getTime() / SECOND_MS;
  const payload = `${orderId}${SEPARATOR}${expires}`;
  return `${payload}${SEPARATOR}${signature(signingKey(jwtSecret), payload)}`;
}

/** The order a token stands for, or `undefined` when it is malformed, forged or expired. */
export function readReviewToken(
  jwtSecret: string,
  token: string,
  now: Date
): ReviewLink | undefined {
  const parts = token.split(SEPARATOR);
  if (parts.length !== 3) return undefined;
  const [orderId, expires, given] = parts;
  if (!ORDER_ID.test(orderId) || !EXPIRY.test(expires)) return undefined;

  const payload = `${orderId}${SEPARATOR}${expires}`;
  const expected = Buffer.from(signature(signingKey(jwtSecret), payload));
  const received = Buffer.from(given);
  if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) {
    return undefined;
  }
  const expiresAt = new Date(Number(expires) * SECOND_MS);
  return expiresAt > now ? { orderId, expiresAt } : undefined;
}

/** The website's page where the holder of `token` writes the review. */
export function reviewPageUrl(siteUrl: string, token: string): string {
  return `${siteUrl.replace(/\/$/, '')}${REVIEW_WRITE_PATH}?token=${encodeURIComponent(token)}`;
}

/** The link for the customer of `orderId`, made `now`. */
export function createReviewLink(
  siteUrl: string,
  jwtSecret: string,
  orderId: string,
  now: Date
): ReviewLinkUrl {
  return {
    url: reviewPageUrl(siteUrl, createReviewToken(jwtSecret, orderId, now)),
    expiresAt: reviewLinkExpiry(now),
  };
}
