import { REVIEW_LINK_LIFETIME_DAYS, reviewEntity } from '@klotilda/domain';
import type { ActionDetails } from '../emails/order-emails';
import type { ModelRegistry } from '../models-registry';
import { reviewUrl } from './review-link';

const DAY_MS = 24 * 60 * 60 * 1000;

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
export async function reviewInvitationDetails(
  registry: ModelRegistry,
  settings: ReviewLinkSettings,
  orderId: string,
  now = new Date()
): Promise<Pick<ActionDetails, 'reviewUrl' | 'reviewUrlExpiresAt'>> {
  if (await hasReview(registry, orderId)) return {};
  return {
    reviewUrl: reviewUrl(settings.siteUrl, settings.jwtSecret, orderId, now),
    reviewUrlExpiresAt: new Date(now.getTime() + REVIEW_LINK_LIFETIME_DAYS * DAY_MS),
  };
}
