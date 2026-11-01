import { reviewEntity } from '@klotilda/domain';
import type { ActionDetails } from '../emails/order-emails';
import type { ModelRegistry } from '../models-registry';
import { createReviewLink } from './review-link';

/** What signs the links and where they lead. */
export interface ReviewLinkSettings {
  jwtSecret: string;
  siteUrl: string;
}

/** Whether the order has its review already: one order, one review. */
export async function hasReview(registry: ModelRegistry, orderId: string): Promise<boolean> {
  const review = await registry.get(reviewEntity.config.name).findOne({ where: { orderId } });
  return review !== null;
}

/**
 * The link the e-mail about a delivered order invites the customer with, and when it ends; nothing
 * once the order has its review.
 */
export async function resolveReviewInvitation(
  registry: ModelRegistry,
  settings: ReviewLinkSettings,
  orderId: string,
  now = new Date()
): Promise<Pick<ActionDetails, 'reviewUrl' | 'reviewUrlExpiresAt'>> {
  if (await hasReview(registry, orderId)) return {};
  const { url, expiresAt } = createReviewLink(settings.siteUrl, settings.jwtSecret, orderId, now);
  return { reviewUrl: url, reviewUrlExpiresAt: expiresAt };
}
