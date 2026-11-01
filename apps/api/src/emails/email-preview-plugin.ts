import { createVerifyToken, validateFields, ValidationError } from '@eleansphere/be-core';
import type { ProjectPlugin } from '@eleansphere/be-core';
import {
  EMAIL_TEMPLATE_KEYS,
  EMAIL_TEMPLATE_PREVIEW_ROUTE,
  emailTemplateFields,
} from '@klotilda/domain';
import type { EmailPreview, EmailPreviewRequest, EmailTemplateKey } from '@klotilda/domain';
import type { BankAccount } from '../env';
import { asyncHandler } from '../http/async-handler';
import type { ModelRegistry } from '../models-registry';
import { reviewLinkExpiry, reviewPageUrl } from '../reviews/review-link';
import { resolveSellerLine } from '../seller/seller';
import { renderEmail } from './email-layout';
import type { EmailContent } from './email-layout';
import {
  newOrderEmail,
  newReviewEmail,
  orderActionEmail,
  orderReceivedEmail,
} from './order-emails';
import type { ActionDetails, PlacedOrder } from './order-emails';

export interface EmailPreviewPluginOptions {
  registry: ModelRegistry;
  jwtSecret: string;
  bankAccount: BankAccount;
  siteUrl: string;
}

/** An order to show the e-mails on: delivered and paid by transfer, or picked up for cash. */
function sampleOrder(key: EmailTemplateKey): PlacedOrder {
  const pickup = key === 'ready-for-pickup';
  return {
    id: 'ord_sample',
    customerFirstName: 'Jana',
    customerLastName: 'Nováková',
    customerEmail: 'jana@example.cz',
    street: 'Dlouhá 1',
    city: 'Praha',
    zip: '110 00',
    shippingName: pickup ? 'Osobní odběr v Praze' : 'Zásilkovna',
    shippingKind: pickup ? 'pickup' : 'delivery',
    shippingPrice: pickup ? 0 : 99,
    paymentName: pickup ? 'Hotově při převzetí' : 'Bankovní převod',
    paymentKind: pickup ? 'cash' : 'bank_transfer',
    paymentFee: 0,
    totalAmount: pickup ? 1200 : 1299,
    variableSymbol: '2611011234',
    paymentStatus: key === 'cancel' || key === 'mark-refunded' ? 'paid' : 'pending',
    items: [{ productId: 'prod_sample', name: 'Váza s modrou glazurou', price: 1200, quantity: 1 }],
  };
}

/** What an action adds to the sample order; the review link leads nowhere real. */
function sampleDetails(siteUrl: string): ActionDetails {
  return {
    trackingNumber: 'Z 1234567890',
    trackingUrl: 'https://tracking.packeta.com/cs/?id=Z%201234567890',
    reviewUrl: reviewPageUrl(siteUrl, 'ukazka'),
    reviewUrlExpiresAt: reviewLinkExpiry(new Date()),
  };
}

const SAMPLE_REVIEW = {
  rating: 5,
  authorName: 'Jana N.',
  body: 'Váza je ještě krásnější než na fotce a přišla skvěle zabalená. Děkuji!',
};

/** The body checked: a known key and the three texts by the template's own field rules. */
function readPreviewRequest(body: unknown): EmailPreviewRequest {
  const request = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const { key, ...texts } = request;
  // The key is not one of the texts (it is read-only on the row): checked on its own.
  const issues = validateFields(emailTemplateFields, texts, { mode: 'patch' });
  if (!(EMAIL_TEMPLATE_KEYS as readonly unknown[]).includes(key)) {
    issues.push({ path: 'key', code: 'enum', params: {} });
  }
  for (const name of ['subject', 'heading'] as const) {
    if (typeof request[name] !== 'string')
      issues.push({ path: name, code: 'required', params: {} });
  }
  if (issues.length > 0) throw new ValidationError(issues);
  return {
    key: key as EmailTemplateKey,
    subject: String(request.subject),
    heading: String(request.heading),
    body: typeof request.body === 'string' ? request.body : '',
  };
}

function previewContent(
  { key, ...text }: EmailPreviewRequest,
  bankAccount: BankAccount,
  siteUrl: string
): EmailContent {
  const order = sampleOrder(key);
  if (key === 'order-received') return orderReceivedEmail(order, bankAccount.display, text);
  if (key === 'new-order') return newOrderEmail(order, text);
  if (key === 'new-review') return newReviewEmail(order, SAMPLE_REVIEW, text);
  return orderActionEmail(key, order, sampleDetails(siteUrl), text);
}

/**
 * `POST /api/email-templates/all/preview` — the signed-in admin sees an e-mail as it would go out,
 * worded as in the form (not yet saved), on a sample order. Rendered by the same code that sends.
 */
export function createEmailPreviewPlugin({
  registry,
  jwtSecret,
  bankAccount,
  siteUrl,
}: EmailPreviewPluginOptions): ProjectPlugin {
  return {
    registerRoutes(app) {
      app.post(
        EMAIL_TEMPLATE_PREVIEW_ROUTE,
        createVerifyToken(jwtSecret),
        asyncHandler(async (req, res) => {
          const content = previewContent(readPreviewRequest(req.body), bankAccount, siteUrl);
          const sellerLine = await resolveSellerLine(registry);
          const answer: EmailPreview = renderEmail(content, { siteUrl, sellerLine });
          res.json(answer);
        })
      );
    },
  };
}
