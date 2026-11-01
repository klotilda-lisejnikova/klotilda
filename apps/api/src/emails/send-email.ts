import type { EmailService } from '@eleansphere/be-core';
import type { EmailOutcome } from '@klotilda/domain';
import { renderEmail } from './email-layout';
import type { EmailContent, EmailFooter } from './email-layout';

/**
 * Sends one message, in HTML and plain text. Never throws: a failure is logged and reported as
 * `failed`, so the order it belongs to still goes through. Without e-mail configured: `skipped`.
 */
export async function sendEmail(
  emailService: EmailService | undefined,
  to: string,
  content: EmailContent,
  footer: EmailFooter
): Promise<EmailOutcome> {
  if (!emailService) return 'skipped';
  try {
    await emailService.send({ to, ...renderEmail(content, footer) });
    return 'sent';
  } catch (err) {
    console.error(`E-mail "${content.subject}" to ${to} failed:`, err);
    return 'failed';
  }
}
