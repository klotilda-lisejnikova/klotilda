import { EMAIL_TEMPLATES, emailTemplateEntity } from '@klotilda/domain';
import type { EmailTemplateKey, EmailText } from '@klotilda/domain';
import type { ModelRegistry } from '../models-registry';

/** An automatic e-mail as the admin worded it, and whether it goes out at all. */
export interface ResolvedEmailText {
  enabled: boolean;
  text: EmailText;
}

/**
 * The admin's wording of an e-mail (`EmailTemplate`), or the default when its row is missing or
 * can't be read (the e-mail still goes out, worded as shipped). An e-mail that must go out
 * (`required`, the order confirmation) is sent even if its row says otherwise.
 */
export async function resolveEmailText(
  registry: ModelRegistry,
  key: EmailTemplateKey
): Promise<ResolvedEmailText> {
  const definition = EMAIL_TEMPLATES[key];
  const fallback = { enabled: true, text: definition };
  const row = await registry
    .get(emailTemplateEntity.config.name)
    .findOne({ where: { key } })
    .catch((err: unknown) => {
      console.error(`Reading the e-mail template ${key} failed, sending the default:`, err);
      return null;
    });
  if (!row) return fallback;
  return {
    enabled: definition.required === true || row.get('enabled') !== false,
    text: {
      subject: String(row.get('subject')),
      heading: String(row.get('heading')),
      body: String(row.get('body') ?? ''),
    },
  };
}
