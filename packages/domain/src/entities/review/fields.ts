import type { Fields } from '@eleansphere/entity-core';
import { asReadOnly } from '../../read-only';

export const REVIEW_STATUSES = ['pending', 'published', 'hidden'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];
export const DEFAULT_REVIEW_STATUS: ReviewStatus = 'pending';

/** The website's languages; a review is shown as written, marked with its own. */
export const REVIEW_LOCALES = ['cs', 'en'] as const;
export type ReviewLocale = (typeof REVIEW_LOCALES)[number];

export const MIN_RATING = 1;
export const MAX_RATING = 5;
/** Fewer characters than this (spaces at the ends left out) say nothing about the order. */
export const REVIEW_BODY_MIN_LENGTH = 10;
export const REVIEW_BODY_MAX_LENGTH = 2000;
export const REVIEW_AUTHOR_NAME_MAX_LENGTH = 60;
const HIDDEN_REASON_MAX_LENGTH = 500;
const REPLY_MAX_LENGTH = 1000;

/** What the customer writes, through the link from the e-mail about the delivered order. */
export const reviewSubmissionFields = {
  /** Stars, 1 to 5. */
  rating: { type: 'INTEGER', required: true, min: MIN_RATING, max: MAX_RATING },
  body: { type: 'TEXT', required: true, maxLength: REVIEW_BODY_MAX_LENGTH },
  /** The name shown with the review, as the customer chose it ("Jana N."). */
  authorName: { type: 'STRING', required: true, maxLength: REVIEW_AUTHOR_NAME_MAX_LENGTH },
  locale: { type: 'ENUM', values: REVIEW_LOCALES, required: true },
} as const satisfies Fields;

/**
 * A stored review. The customer's words stay as written; the admin only decides whether it is
 * shown (`status`), notes why one is hidden and may answer it publicly.
 */
export const reviewFields = {
  /** One review per order. An order with a review can't be deleted before its review. */
  orderId: {
    type: 'STRING',
    required: true,
    unique: true,
    readOnly: true,
    references: { model: 'Order' },
  },
  ...asReadOnly(reviewSubmissionFields),
  /** The order's pieces as `ReviewedItem[]` JSON, so the review names them after they are sold. */
  items: { type: 'TEXT', required: true, readOnly: true },
  /** Shown on the website only once `published`. */
  status: { type: 'ENUM', values: REVIEW_STATUSES, default: DEFAULT_REVIEW_STATUS },
  /** The admin's own note on why a review is hidden; never public. */
  hiddenReason: { type: 'TEXT', maxLength: HIDDEN_REASON_MAX_LENGTH },
  /** The artist's public answer, shown under the review. */
  reply: { type: 'TEXT', maxLength: REPLY_MAX_LENGTH },
} as const satisfies Fields;
