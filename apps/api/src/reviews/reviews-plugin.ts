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
  PUBLIC_REVIEWS_DEFAULT_LIMIT,
  PUBLIC_REVIEWS_MAX_LIMIT,
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
import { hasReview, resolveReviewInvitation } from './review-invitation';
import { readReviewToken } from './review-link';

const CREATED = 201;
const NOT_FOUND = 404;
const CONFLICT = 409;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
/**
 * Per route and client address: a customer reloading the form or retrying it gets through, a
 * script guessing tokens doesn't. The website calls these routes from the visitor's browser (like
 * the checkout), so each customer counts on their own address, never the website's server.
 */
export const REVIEW_RATE_LIMIT: RateLimitConfig = { windowMs: RATE_LIMIT_WINDOW_MS, max: 10 };
const DELIVERED = 'delivered';
const PUBLISHED = 'published';

const LINK_INVALID = 'Odkaz na recenzi neplatí nebo už vypršel.';
const ALREADY_REVIEWED = 'Tuhle objednávku už jste ohodnotili. Děkujeme!';
const NOT_DELIVERED = 'Objednávku půjde ohodnotit, až bude doručená.';
const ORDER_HAS_REVIEW = 'Objednávka má recenzi. Smažte nejdřív ji (v Recenzích).';
const REQUEST_NOT_DELIVERED = 'O recenzi jde požádat jen u doručené objednávky.';
const REQUEST_ALREADY_REVIEWED = 'Objednávka už recenzi má.';

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
async function resolveInvitedOrder(
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
    reply: review.reply?.trim() || null,
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
      throw new HttpError(CONFLICT, ORDER_HAS_REVIEW);
    }
  };
}

/** `GET REVIEW_INVITATION_ROUTE`: what the link invites to review, unless it has its review. */
async function readInvitation(options: ReviewsPluginOptions, token: unknown) {
  const { order, expiresAt } = await resolveInvitedOrder(options, token);
  if (await hasReview(options.registry, order.id)) throw new HttpError(CONFLICT, ALREADY_REVIEWED);
  const invitation: ReviewInvitation = {
    authorName: suggestedAuthorName(order.customerFirstName, order.customerLastName),
    items: reviewedItems(order),
    expiresAt: expiresAt.toISOString(),
  };
  return invitation;
}

/**
 * `POST REVIEW_INVITATION_ROUTE`: the review, saved `pending`. The order row is locked, so the
 * same link sent twice at once makes one review.
 */
function writeReview(
  options: ReviewsPluginOptions,
  sequelize: Sequelize,
  { token, consent: _consent, ...written }: ReviewSubmission
): Promise<{ order: Order; id: string }> {
  const reviews = options.registry.get(reviewEntity.config.name);
  return sequelize.transaction(async (transaction) => {
    const { order } = await resolveInvitedOrder(options, token, transaction);
    if (await reviews.findOne({ where: { orderId: order.id }, transaction })) {
      throw new HttpError(CONFLICT, ALREADY_REVIEWED);
    }
    const created = await reviews.create(
      {
        id: generateId(reviewEntity.config.prefix),
        orderId: order.id,
        ...written,
        items: JSON.stringify(reviewedItems(order)),
      },
      { transaction }
    );
    return { order, id: String(created.get('id')) };
  });
}

/**
 * `GET PUBLIC_REVIEWS_ROUTE`: one page of the published reviews (naming `productId`, when given),
 * newest first. A small shop's reviews are read whole, so the average covers every one of them.
 */
async function listPublicReviews(
  registry: ModelRegistry,
  query: Record<string, unknown>
): Promise<PublicReviewsPage> {
  const page = queryNumber(query.page, 1);
  const limit = queryNumber(query.limit, PUBLIC_REVIEWS_DEFAULT_LIMIT, PUBLIC_REVIEWS_MAX_LIMIT);
  const productId = typeof query.productId === 'string' ? query.productId : '';
  const rows = await registry.get(reviewEntity.config.name).findAll({
    where: { status: PUBLISHED },
    order: [
      ['createdAt', 'DESC'],
      ['id', 'DESC'],
    ],
  });
  const published = rows.map((row) => toPublicReview(row.toJSON() as Review));
  const listed = productId
    ? published.filter((review) => review.items.some((item) => item.productId === productId))
    : published;
  return {
    data: listed.slice((page - 1) * limit, page * limit),
    total: listed.length,
    page,
    limit,
    averageRating: averageOf(published),
  };
}

/**
 * `POST REVIEW_REQUEST_ROUTE`: the delivery e-mail with the link once more — asked for on purpose,
 * so it goes even while that e-mail is turned off. The line in the order's history is added to the
 * row as it is after sending, locked, so two requests at once both stay in it.
 */
async function sendReviewRequest(
  { registry, jwtSecret, siteUrl }: ReviewsPluginOptions,
  sequelize: Sequelize,
  emailService: EmailService | undefined,
  orderId: string
): Promise<Order> {
  const orders = registry.get(orderEntity.config.name);
  const row = await orders.findByPk(orderId);
  if (!row) throw new HttpError(NOT_FOUND, 'Order not found');
  const order = row.toJSON() as Order;
  if (order.orderStatus !== DELIVERED) throw new HttpError(CONFLICT, REQUEST_NOT_DELIVERED);
  const details = await resolveReviewInvitation(registry, { jwtSecret, siteUrl }, order.id);
  if (!details.reviewUrl) throw new HttpError(CONFLICT, REQUEST_ALREADY_REVIEWED);

  const { text } = await resolveEmailText(registry, 'mark-delivered');
  const footer = { siteUrl, sellerLine: await resolveSellerLine(registry) };
  const content = orderActionEmail('mark-delivered', asPlaced(order), details, text);
  const event: OrderEvent = {
    type: 'review-request',
    at: new Date().toISOString(),
    email: await sendEmail(emailService, order.customerEmail, content, footer),
  };
  return sequelize.transaction(async (transaction) => {
    const locked = await orders.findByPk(orderId, { lock: transaction.LOCK.UPDATE, transaction });
    if (!locked) throw new HttpError(NOT_FOUND, 'Order not found');
    const history = parseOrderHistory(locked.toJSON() as Order);
    await locked.update({ history: JSON.stringify([...history, event]) }, { transaction });
    return locked.toJSON() as Order;
  });
}

/**
 * Customers' reviews of their orders:
 *
 * - `GET REVIEW_INVITATION_ROUTE?token=` and `POST REVIEW_INVITATION_ROUTE` — public, through the
 *   link the e-mail about the delivered order carries: what to review, and writing it (one per
 *   order, `pending` until the admin publishes it; the artist is e-mailed).
 * - `GET PUBLIC_REVIEWS_ROUTE` — public: the published reviews, newest first, with the average.
 *   Not rate-limited: the website's server reads it for its cached pages.
 * - `POST REVIEW_REQUEST_ROUTE` — the signed-in admin e-mails the link again.
 *
 * Publishing, hiding, answering and deleting go through the CRUD routes, signed in.
 */
export function createReviewsPlugin(options: ReviewsPluginOptions): ProjectPlugin {
  const { registry, jwtSecret, rateLimit } = options;
  const limiter = () => (rateLimit === 'off' ? [] : [createRateLimiter(rateLimit)]);
  return {
    registerRoutes(app, sequelize, _models, emailService) {
      app.get(
        REVIEW_INVITATION_ROUTE,
        ...limiter(),
        asyncHandler(async (req, res) => {
          res.json(await readInvitation(options, req.query.token));
        })
      );

      app.post(
        REVIEW_INVITATION_ROUTE,
        ...limiter(),
        asyncHandler(async (req, res) => {
          const submission = readSubmission(req.body);
          const { order, id } = await writeReview(options, sequelize, submission);
          res.status(CREATED).json({ id });
          announceReview(options, emailService, order, submission).catch((err: unknown) =>
            console.error(`Announcing review ${id} failed:`, err)
          );
        })
      );

      app.get(
        PUBLIC_REVIEWS_ROUTE,
        asyncHandler(async (req, res) => {
          res.json(await listPublicReviews(registry, req.query));
        })
      );

      app.post(
        REVIEW_REQUEST_ROUTE,
        createVerifyToken(jwtSecret),
        asyncHandler(async (req, res) => {
          res.json(await sendReviewRequest(options, sequelize, emailService, req.params.id));
        })
      );
    },
  };
}
