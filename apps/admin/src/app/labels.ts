import type {
  EmailPlaceholder,
  EmailTemplateKey,
  LegalDocumentKey,
  LegalPlaceholder,
  OrderAction,
  OrderEvent,
  OrderStatus,
  PaymentKind,
  PaymentStatus,
  ShippingKind,
  SiteTextKey,
} from '@klotilda/domain';
import type { BadgeProps } from '@nuxt/ui';

type BadgeColor = NonNullable<BadgeProps['color']>;

export const SHIPPING_KIND_LABELS: Record<ShippingKind, string> = {
  delivery: 'Doručení dopravcem',
  pickup: 'Osobní odběr',
};

export const PAYMENT_KIND_LABELS: Record<PaymentKind, string> = {
  bank_transfer: 'Bankovní převod předem',
  cash: 'Hotově při osobním odběru',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Čeká na platbu',
  paid: 'Zaplaceno',
  failed: 'Neproběhla',
  refunded: 'Vráceno',
};

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, BadgeColor> = {
  pending: 'warning',
  paid: 'success',
  failed: 'error',
  refunded: 'neutral',
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'Nová',
  processing: 'Připravuji',
  ready: 'K vyzvednutí',
  shipped: 'Odesláno',
  delivered: 'Doručeno',
  cancelled: 'Zrušeno',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, BadgeColor> = {
  new: 'info',
  processing: 'warning',
  ready: 'secondary',
  shipped: 'primary',
  delivered: 'success',
  cancelled: 'neutral',
};

/** What the admin can do with an order: button, icon and what it will do. */
export const ORDER_ACTION_LABELS: Record<OrderAction, string> = {
  'mark-paid': 'Platba dorazila',
  ship: 'Odeslat',
  'ready-for-pickup': 'Připraveno k vyzvednutí',
  'mark-delivered': 'Předáno zákazníkovi',
  cancel: 'Zrušit objednávku',
  'mark-refunded': 'Peníze vráceny',
};

export const ORDER_ACTION_ICONS: Record<OrderAction, string> = {
  'mark-paid': 'i-lucide-banknote',
  ship: 'i-lucide-truck',
  'ready-for-pickup': 'i-lucide-hand-heart',
  'mark-delivered': 'i-lucide-package-check',
  cancel: 'i-lucide-x',
  'mark-refunded': 'i-lucide-undo-2',
};

export const ORDER_ACTION_HINTS: Record<OrderAction, string> = {
  'mark-paid':
    'Objednávka se označí jako zaplacená a zákazník dostane potvrzení, že platba dorazila.',
  ship: 'Zákazník dostane e-mail, že je zásilka na cestě, s číslem zásilky a odkazem na sledování.',
  'ready-for-pickup':
    'Zákazník dostane e-mail, že si objednávku může vyzvednout. Napište mu, kde a kdy — jinak ho e-mail požádá, ať se ozve.',
  'mark-delivered': 'Objednávka se uzavře. Zákazníkovi nic nepřijde.',
  cancel: 'Zákazník dostane e-mail o zrušení; zaplacenou objednávku mu slíbí vrátit peníze.',
  'mark-refunded': 'Zákazník dostane e-mail, že jste mu peníze poslali zpět.',
};

/** Actions that would send the customer an e-mail. */
export const NOTIFYING_ACTIONS: readonly OrderAction[] = [
  'mark-paid',
  'ship',
  'ready-for-pickup',
  'cancel',
  'mark-refunded',
];

export const ORDER_EVENT_LABELS: Record<OrderEvent['type'], string> = {
  placed: 'Objednávka přijata',
  'mark-paid': 'Platba dorazila',
  ship: 'Odesláno',
  'ready-for-pickup': 'Připraveno k vyzvednutí',
  'mark-delivered': 'Předáno zákazníkovi',
  cancel: 'Zrušeno',
  'mark-refunded': 'Peníze vráceny',
};

export const EMAIL_OUTCOME_LABELS: Record<NonNullable<OrderEvent['email']>, string> = {
  sent: 'e-mail odešel',
  failed: 'e-mail se nepodařilo odeslat',
  skipped: 'bez e-mailu',
};

/** `USelect` items from a label map, in its order. */
export function toSelectItems<T extends string>(labels: Record<T, string>) {
  return (Object.entries(labels) as [T, string][]).map(([value, label]) => ({ value, label }));
}

/** What each automatic e-mail is, as the "E-maily" page names it. */
export const EMAIL_TEMPLATE_LABELS: Record<EmailTemplateKey, { name: string; when: string }> = {
  'order-received': {
    name: 'Potvrzení objednávky',
    when: 'Zákazníkovi hned po odeslání objednávky, s položkami a údaji k platbě.',
  },
  'new-order': {
    name: 'Nová objednávka (pro vás)',
    when: 'Vám, když přijde objednávka: zákazník, položky a co dál.',
  },
  'mark-paid': { name: 'Platba dorazila', when: 'Zákazníkovi po kliknutí na „Platba dorazila“.' },
  ship: {
    name: 'Zásilka odeslána',
    when: 'Zákazníkovi po kliknutí na „Odeslat“, s číslem a odkazem na sledování zásilky.',
  },
  'ready-for-pickup': {
    name: 'Připraveno k vyzvednutí',
    when: 'Zákazníkovi po kliknutí na „Připraveno k vyzvednutí“.',
  },
  cancel: {
    name: 'Objednávka zrušena',
    when: 'Zákazníkovi po zrušení objednávky, s tím, jak dostane peníze zpět.',
  },
  'mark-refunded': { name: 'Peníze vráceny', when: 'Zákazníkovi po kliknutí na „Peníze vráceny“.' },
};

/** What each placeholder is replaced with, shown beside the text. */
export const EMAIL_PLACEHOLDER_LABELS: Record<EmailPlaceholder, string> = {
  vs: 'variabilní symbol (číslo objednávky)',
  jmeno: 'křestní jméno zákazníka',
  prijmeni: 'příjmení zákazníka',
  castka: 'celková částka, např. 1 299 Kč',
  doprava: 'název dopravy',
  platba: 'název způsobu platby',
  cislo_zasilky: 'číslo zásilky',
};

export const LEGAL_DOCUMENT_LABELS: Record<LegalDocumentKey, { name: string; about: string }> = {
  terms: {
    name: 'Obchodní podmínky',
    about: 'Smlouva se zákazníkem. Zákazník s nimi souhlasí při objednávce.',
  },
  privacy: {
    name: 'Ochrana osobních údajů',
    about: 'Jaké údaje e-shop o zákaznících zpracovává, proč a jak dlouho.',
  },
  withdrawal: {
    name: 'Odstoupení od smlouvy',
    about: 'Vzorový formulář pro vrácení zboží do 14 dnů.',
  },
};

export const LEGAL_PLACEHOLDER_LABELS: Record<LegalPlaceholder, string> = {
  sellerName: 'jméno prodávajícího',
  sellerIco: 'IČO',
  sellerAddress: 'sídlo',
  sellerEmail: 'e-mail prodávajícího',
  sellerPhone: 'telefon (prázdný, není-li vyplněný)',
  sellerRegistration: 'zápis (prázdný, není-li vyplněný)',
  effectiveFrom: 'den, od kterého verze platí',
  termsPath: 'adresa obchodních podmínek (pro odkaz)',
  privacyPath: 'adresa stránky o osobních údajích',
  withdrawalPath: 'adresa formuláře pro odstoupení',
  complaintsAnchor: 'značka oddílu o reklamacích (#reklamace)',
};

/** How the admin shows a website text: where on the site it is, and how it is typed. */
export interface SiteTextLabel {
  section: string;
  label: string;
  help?: string;
  /** Paragraphs rather than a line. */
  long?: boolean;
}

export const SITE_TEXT_LABELS: Record<SiteTextKey, SiteTextLabel> = {
  'home.hero.subtitle': { section: 'Úvod', label: 'Podtitul pod jménem' },
  'home.about.title': { section: 'O mně', label: 'Nadpis' },
  'home.about.bio1': { section: 'O mně', label: 'První odstavec', long: true },
  'home.about.bio2': {
    section: 'O mně',
    label: 'Druhý odstavec',
    help: 'Nepovinný. Prázdný se na webu nezobrazí.',
    long: true,
  },
  'home.gallery.subtitle': { section: 'Galerie', label: 'Podtitul' },
  'home.cta.title': { section: 'E-shop', label: 'Nadpis upoutávky na e-shop' },
  'home.cta.subtitle': { section: 'E-shop', label: 'Text upoutávky' },
  'home.contact.subtitle': { section: 'Kontakt', label: 'Podtitul' },
  'home.contact.email': { section: 'Kontakt', label: 'E-mail' },
  'home.contact.instagram': {
    section: 'Kontakt',
    label: 'Instagram',
    help: 'Jméno účtu, např. @klotilda.lisejnikova. Odkaz z něj web složí sám.',
  },
  'metadata.description': {
    section: 'Vyhledávače',
    label: 'Popis webu',
    help: 'Text, který ukazují vyhledávače a sociální sítě pod názvem stránky.',
    long: true,
  },
};
