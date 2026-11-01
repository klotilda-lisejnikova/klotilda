import {
  createRateLimiter,
  createVerifyToken,
  generateId,
  HttpError,
  validateFields,
  ValidationError,
} from '@eleansphere/be-core';
import type {
  EmailService,
  ModelRouteOverrides,
  ProjectPlugin,
  RateLimitConfig,
  Sequelize,
} from '@eleansphere/be-core';
import type { ValidationIssue } from '@eleansphere/schema';
import {
  orderEntity,
  parseOrderHistory,
  parseOrderItems,
  parseReviewedItems,
  PUBLIC_REVIEWS_ROUTE,
  REVIEW_BODY_MIN_LENGTH,
  REVIEW_INVITATION_ROUTE,
  REVIEW_REQUEST_ROUTE,
  REVIEW_TOKEN_MAX_LENGTH,
  reviewEntity,
  reviewSubmissionFields,
  suggestedAuthorName,
} from '@klotilda/domain';
import type {
  Order,
  OrderEvent,
  PublicReview,
  PublicReviewsPage,
  Review,
  ReviewedItem,
  ReviewInvitation,
  ReviewSubmission,
} from '@klotilda/domain';
import { resolveEmailText } from '../emails/email-templates';
import { newReviewEmail, orderActionEmail } from '../emails/order-emails';
import type { PlacedOrder, WrittenReview } from '../emails/order-emails';
import { sendEmail } from '../emails/send-email';
import { asyncHandler } from '../http/async-handler';
import type { ModelRegistry } from '../models-registry';
import { resolveSellerLine } from '../seller/seller';
import { hasReview, reviewInvitationDetails } from './review-invitation';
import { readReviewToken } from './review-link';

const CREATED = 201;
const NOT_FOUND = 404;
const CONFLICT = 409;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
/** A customer retrying the form gets through; a script guessing tokens doesn't. */
export const REVIEW_RATE_LIMIT: RateLimitConfig = { windowMs: RATE_LIMIT_WINDOW_MS, max: 10 };
const DEFAULT_PAGE_LIMIT = 20;
const MAX_PAGE_LIMIT = 50;
const DELIVERED = 'delivered';
const PUBLISHED = 'published';

const LINK_INVALID = 'Odkaz na recenzi neplatí nebo už vypršel.';
const ALREADY_REVIEWED = 'Tuhle objednávku už jste ohodnotili. Děkujeme!';
const NOT_DELIVERED = 'Objednávku půjde ohodnotit, až bude doručená.';

type BeforeDelete = NonNullable<ModelRouteOverrides['beforeDelete']>;
type Transaction = Awaited<ReturnType<Sequelize['transaction']>>;

export interface ReviewsPluginOptions {
  registry: ModelRegistry;
  jwtSecret: string;
  siteUrl: string;
  /** Where new reviews are announced; unset, nobody is e-mailed. */
  adminEmail: string | undefined;
  rateLimit: RateLimitConfig | 'off';
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The order's pieces, each once, as a review names them. */
function reviewedItems(order: Order): ReviewedItem[] {
  const byProduct = new Map(
    parseOrderItems(order).map((item) => [
      item.productId,
      { productId: item.productId, name: item.name },
    ])
  );
  return [...byProduct.values()];
}

/**
 * The delivered order a link stands for, its row locked inside `transaction`. Refused (404) when
 * the link is forged, expired or its order gone, and (409) when the order isn't delivered.
 */
async function findInvitedOrder(
  options: ReviewsPluginOptions,
  token: unknown,
  transaction?: Transaction
) {
  const link =
    typeof token === 'string' && token.length <= REVIEW_TOKEN_MAX_LENGTH
      ? readReviewToken(options.jwtSecret, token, new Date())
      : undefined;
  if (!link) throw new HttpError(NOT_FOUND, LINK_INVALID);
  const row = await options.registry
    .get(orderEntity.config.name)
    .findByPk(link.orderId, transaction && { lock: transaction.LOCK.UPDATE, transaction });
  if (!row) throw new HttpError(NOT_FOUND, LINK_INVALID);
  const order = row.toJSON() as Order;
  if (order.orderStatus !== DELIVERED) throw new HttpError(CONFLICT, NOT_DELIVERED);
  return { order, expiresAt: link.expiresAt };
}

/** The form's body, checked by the review's own field rules, the text long enough to say something. */
function readSubmission(body: unknown): ReviewSubmission {
  const request = isRecord(body) ? body : {};
  const issues: ValidationIssue[] = validateFields(reviewSubmissionFields, request, {
    mode: 'create',
  });
  if (
    typeof request.body === 'string' &&
    request.body.trim().length < REVIEW_BODY_MIN_LENGTH &&
    !issues.some((issue) => issue.path === 'body')
  ) {
    issues.push({ path: 'body', code: 'minLength', params: { min: REVIEW_BODY_MIN_LENGTH } });
  }
  if (typeof request.authorName === 'string' && request.authorName.trim() === '') {
    issues.push({ path: 'authorName', code: 'required', params: {} });
  }
  // The customer must have agreed to the review being published; nothing else counts.
  if (request.consent !== true) issues.push({ path: 'consent', code: 'required', params: {} });
  if (typeof request.token !== 'string')
    issues.push({ path: 'token', code: 'required', params: {} });
  if (issues.length > 0) throw new ValidationError(issues);
  return {
    token: String(request.token),
    rating: Number(request.rating),
    body: String(request.body).trim(),
    authorName: String(request.authorName).trim(),
    locale: request.locale as ReviewSubmission['locale'],
    consent: true,
  };
}

const asPlaced = (order: Order): PlacedOrder => ({ ...order, items: parseOrderItems(order) });

/** Tells the artist a review waits for her; a failure is only logged. */
async function announceReview(
  options: ReviewsPluginOptions,
  emailService: EmailService | undefined,
  order: Order,
  review: WrittenReview
): Promise<void> {
  if (!options.adminEmail) return;
  const { enabled, text } = await resolveEmailText(options.registry, 'new-review');
  if (!enabled) return;
  const footer = {
    siteUrl: options.siteUrl,
    sellerLine: await resolveSellerLine(options.registry),
  };
  await sendEmail(
    emailService,
    options.adminEmail,
    newReviewEmail(asPlaced(order), review, text),
    footer
  );
}

/** A published review without anything that leads to the order or the customer. */
function toPublicReview(review: Review): PublicReview {
  return {
    id: review.id,
    rating: review.rating,
    body: review.body,
    authorName: review.authorName,
    locale: review.locale,
    items: parseReviewedItems(review),
    reply: review.reply ?? null,
    createdAt: new Date(review.createdAt).toISOString(),
  };
}

/** A whole number from the query within `[1, max]`, else `fallback`. */
function queryNumber(value: unknown, fallback: number, max = Number.MAX_SAFE_INTEGER): number {
  const number = typeof value === 'string' ? Number(value) : NaN;
  return Number.isInteger(number) && number >= 1 ? Math.min(number, max) : fallback;
}

const averageOf = (reviews: PublicReview[]) =>
  reviews.length === 0
    ? null
    : Math.round((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length) * 10) /
      10;

/**
 * `routes.Order.beforeDelete`: an order with a review keeps it (the foreign key would refuse it
 * anyway, as an error the admin can't read); the review goes first.
 */
export function refuseDeletingReviewedOrder(registry: ModelRegistry): BeforeDelete {
  return async (row) => {
    if (await hasReview(registry, String(row.get('id')))) {
      throw new HttpError(CONFLICT, 'Objednávka má recenzi. Smažte nejdřív ji (v Recenzích).');
    }
  };
}

/**
 * Customers' reviews of their orders:
 *
 * - `GET REVIEW_INVITATION_ROUTE?token=` and `POST REVIEW_INVITATION_ROUTE` — public, through the
 *   link the e-mail about the delivered order carries: what to review, and writing it (one per
 *   order, `pending` until the admin publishes it; the artist is e-mailed).
 * - `GET PUBLIC_REVIEWS_ROUTE` — public: the published reviews, newest first, with the average.
 * - `POST REVIEW_REQUEST_ROUTE` — the signed-in admin e-mails the link again.
 *
 * Publishing, hiding, answering and deleting go through the CRUD routes, signed in.
 */
export function createReviewsPlugin(options: ReviewsPluginOptions): ProjectPlugin {
  const { registry, jwtSecret, siteUrl, rateLimit } = options;
  return {
    registerRoutes(app, sequelize, _models, emailService) {
      const limits = rateLimit === 'off' ? [] : [createRateLimiter(rateLimit)];

      app.get(
        REVIEW_INVITATION_ROUTE,
        ...limits,
        asyncHandler(async (req, res) => {
          const { order, expiresAt } = await findInvitedOrder(options, req.query.token);
          if (await hasReview(registry, order.id)) throw new HttpError(CONFLICT, ALREADY_REVIEWED);
          const answer: ReviewInvitation = {
            authorName: suggestedAuthorName(order.customerFirstName, order.customerLastName),
            items: reviewedItems(order),
            expiresAt: expiresAt.toISOString(),
          };
          res.json(answer);
        })
      );

      app.post(
        REVIEW_INVITATION_ROUTE,
        ...limits,
        asyncHandler(async (req, res) => {
          const { token, consent: _consent, ...written } = readSubmission(req.body);
          const reviews = registry.get(reviewEntity.config.name);

          // The order row is locked, so the same link sent twice at once makes one review.
          const { order, id } = await sequelize.transaction(async (transaction) => {
            const invited = await findInvitedOrder(options, token, transaction);
            const existing = await reviews.findOne({
              where: { orderId: invited.order.id },
              transaction,
            });
            if (existing) throw new HttpError(CONFLICT, ALREADY_REVIEWED);
            const created = await reviews.create(
              {
                id: generateId(reviewEntity.config.prefix),
                orderId: invited.order.id,
                ...written,
                items: JSON.stringify(reviewedItems(invited.order)),
              },
              { transaction }
            );
            return { order: invited.order, id: String(created.get('id')) };
          });

          res.status(CREATED).json({ id });
          announceReview(options, emailService, order, written).catch((err: unknown) =>
            console.error(`Announcing review ${id} failed:`, err)
          );
        })
      );

      app.get(
        PUBLIC_REVIEWS_ROUTE,
        asyncHandler(async (req, res) => {
          const page = queryNumber(req.query.page, 1);
          const limit = queryNumber(req.query.limit, DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT);
          const productId = typeof req.query.productId === 'string' ? req.query.productId : '';
          // A small shop's reviews: read whole, so the average covers every one of them.
          const rows = await registry.get(reviewEntity.config.name).findAll({
            where: { status: PUBLISHED },
            order: [
              ['createdAt', 'DESC'],
              ['id', 'DESC'],
            ],
          });
          const published = rows.map((row) => toPublicReview(row.toJSON() as Review));
          const listed = productId
            ? published.filter((review) =>
                review.items.some((item) => item.productId === productId)
              )
            : published;
          const answer: PublicReviewsPage = {
            data: listed.slice((page - 1) * limit, page * limit),
            total: listed.length,
            page,
            limit,
            averageRating: averageOf(published),
          };
          res.json(answer);
        })
      );

      app.post(
        REVIEW_REQUEST_ROUTE,
        createVerifyToken(jwtSecret),
        asyncHandler(async (req, res) => {
          const row = await registry.get(orderEntity.config.name).findByPk(req.params.id);
          if (!row) throw new HttpError(NOT_FOUND, 'Order not found');
          const order = row.toJSON() as Order;
          if (order.orderStatus !== DELIVERED) {
            throw new HttpError(CONFLICT, 'O recenzi jde požádat jen u doručené objednávky.');
          }
          const details = await reviewInvitationDetails(registry, { jwtSecret, siteUrl }, order.id);
          if (!details.reviewUrl) throw new HttpError(CONFLICT, 'Objednávka už recenzi má.');

          // Asked for on purpose, so it goes even while the delivery e-mail is turned off.
          const { text } = await resolveEmailText(registry, 'mark-delivered');
          const footer = { siteUrl, sellerLine: await resolveSellerLine(registry) };
          const event: OrderEvent = { type: 'review-request', at: new Date().toISOString() };
          event.email = await sendEmail(
            emailService,
            order.customerEmail,
            orderActionEmail('mark-delivered', asPlaced(order), details, text),
            footer
          );
          await row.update({ history: JSON.stringify([...parseOrderHistory(order), event]) });
          res.json(row.toJSON());
        })
      );
    },
  };
}
