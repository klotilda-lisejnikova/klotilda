/**
 * The e-mails the API sends by itself, one `EmailTemplate` row each. Five are named after the
 * order action that sends them.
 */
export const EMAIL_TEMPLATE_KEYS = [
  'order-received',
  'new-order',
  'mark-paid',
  'ship',
  'ready-for-pickup',
  'cancel',
  'mark-refunded',
] as const;
export type EmailTemplateKey = (typeof EMAIL_TEMPLATE_KEYS)[number];

/** Whether `value` names one of the automatic e-mails (an order action may, a URL's key must). */
export const isEmailTemplateKey = (value: string): value is EmailTemplateKey =>
  (EMAIL_TEMPLATE_KEYS as readonly string[]).includes(value);

/** What a placeholder stands for, filled from the order (`{{vs}}` → its variable symbol). */
export const EMAIL_PLACEHOLDERS = [
  'vs',
  'jmeno',
  'prijmeni',
  'castka',
  'doprava',
  'vydejni_misto',
  'platba',
  'cislo_zasilky',
] as const;
export type EmailPlaceholder = (typeof EMAIL_PLACEHOLDERS)[number];
