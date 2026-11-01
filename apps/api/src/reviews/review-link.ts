import crypto from 'node:crypto';
import { REVIEW_LINK_LIFETIME_DAYS, REVIEW_WRITE_PATH } from '@klotilda/domain';

const DAY_MS = 24 * 60 * 60 * 1000;
const SEPARATOR = '.';
/**
 * The links are signed with a key of their own, derived from `JWT_SECRET`, so no token the API
 * signs for one purpose (a session) is ever valid for the other. Changing `JWT_SECRET` ends the
 * links already sent.
 */
const KEY_LABEL = 'klotilda/review-link/v1';
/** Order ids are the model prefix and hex characters; anything else is not one of ours. */
const ORDER_ID = /^[a-z]+[0-9a-f]+$/;
const EXPIRY = /^\d+$/;

/** Who a valid link lets write a review, and until when. */
export interface ReviewLink {
  orderId: string;
  expiresAt: Date;
}

function signingKey(jwtSecret: string): Buffer {
  return crypto.createHmac('sha256', jwtSecret).update(KEY_LABEL).digest();
}

function signature(key: Buffer, payload: string): string {
  return crypto.createHmac('sha256', key).update(payload).digest('base64url');
}

/** `ord….1798761600.<signature>`: the order, when the link ends (Unix seconds), signed. */
export function createReviewToken(jwtSecret: string, orderId: string, now: Date): string {
  const expires = Math.floor((now.getTime() + REVIEW_LINK_LIFETIME_DAYS * DAY_MS) / 1000);
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

  const expected = Buffer.from(
    signature(signingKey(jwtSecret), `${orderId}${SEPARATOR}${expires}`)
  );
  const received = Buffer.from(given);
  if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) {
    return undefined;
  }
  const expiresAt = new Date(Number(expires) * 1000);
  return expiresAt > now ? { orderId, expiresAt } : undefined;
}

/** The website's page where the customer of `orderId` writes the review. */
export function reviewUrl(siteUrl: string, jwtSecret: string, orderId: string, now: Date): string {
  const token = createReviewToken(jwtSecret, orderId, now);
  return `${siteUrl.replace(/\/$/, '')}${REVIEW_WRITE_PATH}?token=${encodeURIComponent(token)}`;
}
