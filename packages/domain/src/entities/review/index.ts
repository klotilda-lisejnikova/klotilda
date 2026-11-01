import { defineEntity } from '@eleansphere/entity-core';
import type { InferCreateDto } from '@eleansphere/entity-core';
import type { Order } from '../order';
import { reviewFields } from './fields';
import type { ReviewLocale, reviewSubmissionFields } from './fields';

export * from './fields';

export const REVIEWS_PATH = '/api/reviews';
/**
 * `GET ?token=` — what the link from the e-mail invites to review; `POST` with a
 * `ReviewSubmission` — writes the review. Public. The `all` segment keeps both clear of the CRUD
 * route `/api/reviews/:id`.
 */
export const REVIEW_INVITATION_ROUTE = '/api/reviews/all/invitation';
/** `GET ?page=&limit=&productId=` — the published reviews, newest first. Public. */
export const PUBLIC_REVIEWS_ROUTE = '/api/reviews/all/public';
/** A page of `PUBLIC_REVIEWS_ROUTE` when `limit` isn't given, and the most it answers. */
export const PUBLIC_REVIEWS_DEFAULT_LIMIT = 20;
export const PUBLIC_REVIEWS_MAX_LIMIT = 50;
/** `POST` — the signed-in admin sends the customer of a delivered order the link again. */
export const REVIEW_REQUEST_ROUTE = '/api/orders/:id/review-request';

/** The website's page the e-mail links to, with the token as `?token=`. */
export const REVIEW_WRITE_PATH = '/shop/recenze/napsat';
/** How long the link from the e-mail lets the customer write the review. */
export const REVIEW_LINK_LIFETIME_DAYS = 180;
/** The longest token the API reads; a real one is far shorter. */
export const REVIEW_TOKEN_MAX_LENGTH = 200;
/**
 * The 409 of `REVIEW_INVITATION_ROUTE` for an order that is no longer delivered, which the website
 * tells apart from the 409 of an order already reviewed.
 */
export const REVIEW_NOT_DELIVERED_MESSAGE = 'Objednávku půjde ohodnotit, až bude doručená.';

/** A piece of the reviewed order: the product it was, and its name when ordered. */
export interface ReviewedItem {
  productId: string;
  name: string;
}

/** `GET REVIEW_INVITATION_ROUTE` — what the form shows before the customer writes. */
export interface ReviewInvitation {
  /** A name to show, suggested from the order: the first name and the surname's initial. */
  authorName: string;
  items: ReviewedItem[];
  /** ISO timestamp: the link works until then. */
  expiresAt: string;
}

/**
 * `POST REVIEW_INVITATION_ROUTE`. `consent` must be `true`: the customer agrees to the review
 * being published with the name they chose.
 */
export type ReviewSubmission = InferCreateDto<typeof reviewSubmissionFields> & {
  token: string;
  consent: true;
};

/** A published review as the website shows it: nothing that leads to the order or the customer. */
export interface PublicReview {
  id: string;
  rating: number;
  body: string;
  authorName: string;
  locale: ReviewLocale;
  items: ReviewedItem[];
  reply: string | null;
  /** ISO timestamp: when it was written. */
  createdAt: string;
}

/** `GET PUBLIC_REVIEWS_ROUTE` — one page, with the average and count of every published review. */
export interface PublicReviewsPage {
  data: PublicReview[];
  /** The published reviews this list covers (naming the product, when one was asked for). */
  total: number;
  page: number;
  limit: number;
  /**
   * The average stars of every published review — the shop's, even when the list names one
   * product — to one decimal; `null` with none.
   */
  averageRating: number | null;
}

export interface PublicReviewsQuery {
  page?: number;
  limit?: number;
  productId?: string;
}

/**
 * Reviews of orders, written by the customers through a link e-mailed when the order is delivered
 * (`POST REVIEW_INVITATION_ROUTE`, the only way one comes to be). The admin lists, reads, publishes
 * or hides, answers and deletes them through the CRUD routes; the website reads only the
 * published ones through `PUBLIC_REVIEWS_ROUTE`.
 */
export const reviewEntity = defineEntity({
  name: 'Review',
  prefix: 'rev',
  basePath: REVIEWS_PATH,
  access: { read: 'auth', write: 'auth' },
  fields: reviewFields,
  query: {
    filter: { status: 'in', orderId: 'eq' },
    sort: ['createdAt', 'rating'],
    defaultSort: '-createdAt',
    search: ['authorName', 'body'],
    defaultLimit: 50,
    maxLimit: 200,
  },
  extend: (Base) =>
    class extends Base {
      invitation(token: string) {
        return this.get<ReviewInvitation, { token: string }>(REVIEW_INVITATION_ROUTE, { token });
      }

      submit(request: ReviewSubmission) {
        return this.post<{ id: string }>(REVIEW_INVITATION_ROUTE, request);
      }

      listPublic({
        page = 1,
        limit = PUBLIC_REVIEWS_DEFAULT_LIMIT,
        productId,
      }: PublicReviewsQuery = {}) {
        return this.get<PublicReviewsPage, PublicReviewsQuery>(PUBLIC_REVIEWS_ROUTE, {
          page,
          limit,
          productId: productId || undefined,
        });
      }

      /**
       * E-mails the customer of a delivered order the link to write a review again; answers the
       * order, its history with the request.
       */
      requestFor(orderId: string) {
        return this.post<Order>(
          REVIEW_REQUEST_ROUTE.replace(':id', encodeURIComponent(orderId)),
          {}
        );
      }
    },
});

export type Review = InstanceType<typeof reviewEntity.Dto>;

/** The stored `items` column, read back. */
export function parseReviewedItems(review: { items: string }): ReviewedItem[] {
  return JSON.parse(review.items) as ReviewedItem[];
}

/** "Jana N." from the order's names: what a review is signed with unless the customer changes it. */
export function suggestedAuthorName(firstName: string, lastName: string): string {
  const initial = lastName.trim().charAt(0).toLocaleUpperCase('cs');
  return [firstName.trim(), initial && `${initial}.`].filter(Boolean).join(' ');
}
