import { defineEntity } from '@eleansphere/entity-core';
import { emailTemplateFields } from './fields';
import type { EmailPlaceholder, EmailTemplateKey } from './keys';

export * from './keys';

export const EMAIL_TEMPLATES_PATH = '/api/email-templates';
/** `POST` with `{ key, subject, heading, body }`: the e-mail rendered for a sample order. */
export const EMAIL_TEMPLATE_PREVIEW_ROUTE = '/api/email-templates/all/preview';

/** What the admin may change of an e-mail. */
export interface EmailText {
  subject: string;
  heading: string;
  body: string;
}

/** `POST EMAIL_TEMPLATE_PREVIEW_ROUTE` */
export type EmailPreviewRequest = EmailText & { key: EmailTemplateKey };

/** The e-mail as it would go out: the subject, and the HTML and plain text bodies. */
export interface EmailPreview {
  subject: string;
  html: string;
  text: string;
}

/**
 * The wording of the automatic e-mails, one row per `EMAIL_TEMPLATE_KEYS`. The admin edits the
 * subject, heading and text; the parts made from the order (items, payment details, tracking, legal
 * links) are added by the API around them. Rows are never created or deleted through the API.
 */
export const emailTemplateEntity = defineEntity({
  name: 'EmailTemplate',
  prefix: 'eml',
  basePath: EMAIL_TEMPLATES_PATH,
  access: { read: 'auth', write: 'auth' },
  fields: emailTemplateFields,
  query: { sort: ['createdAt'], defaultSort: 'createdAt', defaultLimit: 50, maxLimit: 50 },
  extend: (Base) =>
    class extends Base {
      preview(request: EmailPreviewRequest) {
        return this.post<EmailPreview>(EMAIL_TEMPLATE_PREVIEW_ROUTE, request);
      }
    },
});

export type EmailTemplate = InstanceType<typeof emailTemplateEntity.Dto>;

/** What each e-mail is, which placeholders it knows and the text it starts with. */
export interface EmailTemplateDefinition extends EmailText {
  /** Who gets it: the customer, or the artist (`ADMIN_EMAIL`). */
  to: 'customer' | 'artist';
  placeholders: readonly EmailPlaceholder[];
  /** Always sent: the customer must get the order confirmed (the terms promise it). */
  required?: boolean;
}

const ORDER_PLACEHOLDERS = [
  'vs',
  'jmeno',
  'prijmeni',
  'castka',
  'doprava',
  'vydejni_misto',
  'platba',
] as const satisfies readonly EmailPlaceholder[];

/** The defaults, which "Obnovit výchozí text" restores. */
export const EMAIL_TEMPLATES: Record<EmailTemplateKey, EmailTemplateDefinition> = {
  'order-received': {
    to: 'customer',
    required: true,
    placeholders: ORDER_PLACEHOLDERS,
    subject: 'Objednávka {{vs}} — přijata',
    heading: 'Děkujeme za objednávku',
    body: 'Dobrý den, objednávku {{vs}} jsme přijali.',
  },
  'new-order': {
    to: 'artist',
    placeholders: ORDER_PLACEHOLDERS,
    subject: 'Nová objednávka {{vs}} — {{castka}}',
    heading: 'Nová objednávka',
    body: '',
  },
  'mark-paid': {
    to: 'customer',
    placeholders: ORDER_PLACEHOLDERS,
    subject: 'Objednávka {{vs}} — platba dorazila',
    heading: 'Platba dorazila',
    body: 'Děkujeme, platbu za objednávku {{vs}} jsme přijali.',
  },
  ship: {
    to: 'customer',
    placeholders: [...ORDER_PLACEHOLDERS, 'cislo_zasilky'],
    subject: 'Objednávka {{vs}} je na cestě',
    heading: 'Zásilka je na cestě',
    body: 'Objednávku {{vs}} jsme odeslali ({{doprava}}).',
  },
  'ready-for-pickup': {
    to: 'customer',
    placeholders: ORDER_PLACEHOLDERS,
    subject: 'Objednávka {{vs}} je připravená k vyzvednutí',
    heading: 'Připraveno k vyzvednutí',
    body: 'Objednávka {{vs}} na vás čeká.',
  },
  cancel: {
    to: 'customer',
    placeholders: ORDER_PLACEHOLDERS,
    subject: 'Objednávka {{vs}} byla zrušena',
    heading: 'Objednávka zrušena',
    body: 'Objednávku {{vs}} jsme zrušili.',
  },
  'mark-refunded': {
    to: 'customer',
    placeholders: ORDER_PLACEHOLDERS,
    subject: 'Objednávka {{vs}} — peníze jsou na cestě zpět',
    heading: 'Vrátili jsme vám peníze',
    body: 'Za zrušenou objednávku {{vs}} jsme vám vrátili {{castka}}.',
  },
};
