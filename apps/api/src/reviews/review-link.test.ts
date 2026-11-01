import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { REVIEW_LINK_LIFETIME_DAYS } from '@klotilda/domain';
import { createReviewLink, createReviewToken, readReviewToken } from './review-link';

const SECRET = 'integration-test-secret-of-sufficient-length';
const ORDER_ID = 'ord0123456789abcdef0123456789abcdef';
const NOW = new Date('2026-11-01T12:00:00Z');
const DAY_MS = 24 * 60 * 60 * 1000;
const later = (days: number) => new Date(NOW.getTime() + days * DAY_MS);

describe('Review links', () => {
  it('let the customer of the order in until the link ends', () => {
    const token = createReviewToken(SECRET, ORDER_ID, NOW);
    expect(readReviewToken(SECRET, token, later(1))).toEqual({
      orderId: ORDER_ID,
      expiresAt: later(REVIEW_LINK_LIFETIME_DAYS),
    });
    expect(readReviewToken(SECRET, token, later(REVIEW_LINK_LIFETIME_DAYS))).toBeUndefined();
  });

  it('refuse a token signed with another secret, for another order or changed', () => {
    const token = createReviewToken(SECRET, ORDER_ID, NOW);
    const [, expires, signature] = token.split('.');
    expect(readReviewToken(`${SECRET}!`, token, NOW)).toBeUndefined();
    expect(readReviewToken(SECRET, `ord0ff.${expires}.${signature}`, NOW)).toBeUndefined();
    expect(
      readReviewToken(SECRET, `${ORDER_ID}.${Number(expires) + 1}.${signature}`, NOW)
    ).toBeUndefined();
    expect(readReviewToken(SECRET, `${token}x`, NOW)).toBeUndefined();
    expect(readReviewToken(SECRET, 'nonsense', NOW)).toBeUndefined();
    expect(readReviewToken(SECRET, `../${token}`, NOW)).toBeUndefined();
  });

  it("don't take a session's signature for a link's", () => {
    // The links sign with a key derived from the secret, never with the secret itself.
    const payload = `${ORDER_ID}.${Math.floor(later(1).getTime() / 1000)}`;
    const withSecret = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
    expect(readReviewToken(SECRET, `${payload}.${withSecret}`, NOW)).toBeUndefined();
  });

  it("point at the website's review page", () => {
    const link = createReviewLink('https://klotilda.test/', SECRET, ORDER_ID, NOW);
    expect(link.expiresAt).toEqual(later(REVIEW_LINK_LIFETIME_DAYS));
    const url = new URL(link.url);
    expect(`${url.origin}${url.pathname}`).toBe('https://klotilda.test/shop/recenze/napsat');
    expect(readReviewToken(SECRET, url.searchParams.get('token') ?? '', NOW)?.orderId).toBe(
      ORDER_ID
    );
  });

  it('carry any order id an e-mail could offer, and refuse to make one it could not', () => {
    for (const orderId of ['ord1', 'ord_0123abc', '550e8400-e29b-41d4-a716-446655440000']) {
      const token = createReviewToken(SECRET, orderId, NOW);
      expect(readReviewToken(SECRET, token, NOW)?.orderId).toBe(orderId);
    }
    expect(() => createReviewToken(SECRET, 'ord.1', NOW)).toThrow();
  });
});
