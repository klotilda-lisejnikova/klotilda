import {
  COMPLAINTS_ANCHOR,
  fillPlaceholders,
  formatCzechDate,
  LEGAL_PATHS,
  legalVersionDate,
} from '@klotilda/domain';
import type {
  EmailPlaceholder,
  EmailTemplateKey,
  EmailText,
  OrderItem,
  PaymentKind,
  PaymentStatus,
  PickupPointType,
  ShippingKind,
} from '@klotilda/domain';
import { formatCzk } from './email-layout';
import type { EmailBlock, EmailContent } from './email-layout';

/** What the e-mails about an order say. Customers know an order by its variable symbol. */
export interface PlacedOrder {
  id: string;
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  street: string;
  city: string;
  zip: string;
  shippingName: string;
  shippingKind: ShippingKind;
  shippingPrice: number;
  /** The carrier's pickup point the parcel goes to, instead of the address; empty without one. */
  pickupPointId?: string | null;
  pickupPointName?: string | null;
  pickupPointAddress?: string | null;
  pickupPointType?: PickupPointType | null;
  paymentName: string;
  paymentKind: PaymentKind;
  paymentFee: number;
  totalAmount: number;
  variableSymbol: string;
  paymentStatus: PaymentStatus;
  items: OrderItem[];
  /** The terms version the order was placed under; orders from before versions have none. */
  termsVersion?: string | null;
}

/** What the admin added to the action. */
export interface ActionDetails {
  message?: string;
  trackingNumber?: string;
  /** The parcel's link, from the shipping method. */
  trackingUrl?: string;
}

const isPickup = (order: PlacedOrder) => order.shippingKind === 'pickup';
/** Paid in cash at the pickup, never by transfer: no account, no refund to one. */
const isCash = (order: PlacedOrder) => order.paymentKind === 'cash';

/** "obchodních podmínek platných od 2. 11. 2026", by the order's own version. */
const agreedTerms = ({ termsVersion }: PlacedOrder) =>
  termsVersion
    ? `obchodních podmínek platných od ${formatCzechDate(legalVersionDate(termsVersion))}`
    : 'obchodních podmínek';

const address = (order: PlacedOrder) => `${order.street}, ${order.zip} ${order.city}`;

/** The pickup point as one line, `Praha 4, Budějovická (Albert), Budějovická 1667/64, 140 00 Praha`. */
const pickupPoint = (order: PlacedOrder): string | undefined =>
  order.pickupPointName
    ? [order.pickupPointName, order.pickupPointAddress].filter(Boolean).join(', ')
    : undefined;

/** Where the parcel goes: the chosen pickup point, else the customer's address. */
function destinationBlock(order: PlacedOrder): EmailBlock {
  const point = pickupPoint(order);
  return point
    ? { kind: 'facts', rows: [['Výdejní místo', point]] }
    : { kind: 'facts', rows: [['Doručení na adresu', address(order)]] };
}

/** How the customer collects from a pickup point once the parcel is there. */
function collectingText(order: PlacedOrder): string | undefined {
  if (!pickupPoint(order)) return undefined;
  return order.pickupPointType === 'box'
    ? 'Až zásilka dorazí do Z-BOXu, přijde vám SMS a e-mail s kódem pro otevření schránky. Vyzvednout si ji můžete do 7 dnů.'
    : 'Až zásilka dorazí na výdejní místo, přijde vám SMS a e-mail s heslem pro vyzvednutí. Vyzvednout si ji můžete do 7 dnů.';
}

function itemsBlock(order: PlacedOrder): EmailBlock {
  return {
    kind: 'items',
    items: order.items,
    shipping: { label: order.shippingName, price: order.shippingPrice },
    ...(order.paymentFee > 0 && { payment: { label: order.paymentName, price: order.paymentFee } }),
    total: order.totalAmount,
  };
}

const paragraphs = (text: string | undefined): EmailBlock[] =>
  text ? [{ kind: 'paragraph', text }] : [];

const noteBlocks = (message: string | undefined): EmailBlock[] =>
  message?.trim() ? [{ kind: 'note', text: message.trim() }] : [];

/** What the placeholders of the admin's text stand for in this order. */
function placeholderValues(
  order: PlacedOrder,
  details: ActionDetails
): Record<EmailPlaceholder, string> {
  return {
    vs: order.variableSymbol,
    jmeno: order.customerFirstName,
    prijmeni: order.customerLastName,
    castka: formatCzk(order.totalAmount),
    doprava: order.shippingName,
    vydejni_misto: pickupPoint(order) ?? '',
    platba: order.paymentName,
    cislo_zasilky: details.trackingNumber ?? '',
  };
}

/** The admin's wording, filled in: its subject and heading, and its text as paragraphs. */
interface FilledText {
  subject: string;
  title: string;
  /** The text's paragraphs, split at blank lines. */
  intro: EmailBlock[];
}

function fillText(text: EmailText, order: PlacedOrder, details: ActionDetails = {}): FilledText {
  const values = placeholderValues(order, details);
  const fill = (written: string) => fillPlaceholders(written, values).trim();
  return {
    // One line: a customer's name with a line break in it must not split the header.
    subject: fill(text.subject).replace(/\s+/g, ' '),
    title: fill(text.heading),
    intro: fill(text.body)
      .split(/\r?\n\s*\r?\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean)
      .map((paragraph) => ({ kind: 'paragraph', text: paragraph })),
  };
}

/** How the customer pays a just placed order: the transfer's details, or cash at the pickup. */
function paymentBlocks(order: PlacedOrder, bankAccount: string): EmailBlock[] {
  if (isCash(order)) {
    return [
      {
        kind: 'paragraph',
        text: 'Pustíme se do přípravy. Zaplatíte ji hotově při převzetí.',
      },
      itemsBlock(order),
      { kind: 'facts', rows: [['Zaplatíte při převzetí', formatCzk(order.totalAmount)]] },
    ];
  }
  return [
    { kind: 'paragraph', text: 'Jakmile na účet dorazí platba, pustíme se do přípravy.' },
    itemsBlock(order),
    {
      kind: 'facts',
      rows: [
        ['Číslo účtu', bankAccount],
        ['Variabilní symbol', order.variableSymbol],
        ['Částka', formatCzk(order.totalAmount)],
      ],
    },
    { kind: 'paragraph', text: 'Platit můžete i QR kódem ze stránky s potvrzením objednávky.' },
  ];
}

/**
 * To the customer, as soon as the order is placed: the admin's text, then what they ordered and
 * how to pay. For a transfer the QR code is on the shop's confirmation page; the e-mail carries
 * account, symbol and amount as text. The terms and the right of withdrawal close it.
 */
export function orderReceivedEmail(
  order: PlacedOrder,
  bankAccount: string,
  text: EmailText
): EmailContent {
  const { subject, title, intro } = fillText(text, order);
  return {
    subject,
    title,
    blocks: [
      ...intro,
      ...paymentBlocks(order, bankAccount),
      isPickup(order)
        ? {
            kind: 'paragraph',
            text: 'Až bude objednávka připravená, ozveme se, kde a kdy si ji vyzvednete.',
          }
        : destinationBlock(order),
      {
        kind: 'paragraph',
        text: `Objednávku jste odeslali podle ${agreedTerms(order)}. Zboží můžete do 14 dnů od převzetí vrátit bez udání důvodu.`,
      },
      {
        kind: 'links',
        links: [
          { label: 'Obchodní podmínky', href: LEGAL_PATHS.terms },
          { label: 'Reklamace', href: `${LEGAL_PATHS.terms}#${COMPLAINTS_ANCHOR}` },
          { label: 'Formulář pro odstoupení', href: LEGAL_PATHS.withdrawal },
        ],
      },
    ],
  };
}

/** To the artist: a new order, and the symbol to look for on the bank account (or cash to take). */
export function newOrderEmail(order: PlacedOrder, text: EmailText): EmailContent {
  const { subject, title, intro } = fillText(text, order);
  return {
    subject,
    title,
    blocks: [
      ...intro,
      {
        kind: 'facts',
        rows: [
          ['Zákazník', `${order.customerFirstName} ${order.customerLastName}`],
          ['E-mail', order.customerEmail],
          ['Adresa', address(order)],
          ...(order.pickupPointName
            ? ([
                ['Výdejní místo', pickupPoint(order) ?? ''],
                ['ID výdejního místa', order.pickupPointId ?? ''],
              ] satisfies [string, string][])
            : []),
          ['Variabilní symbol', order.variableSymbol],
          ['Platba', order.paymentName],
        ],
      },
      itemsBlock(order),
      {
        kind: 'paragraph',
        text: isCash(order)
          ? `Sklad je u položek už snížený. Zákazník platí hotově při převzetí: připravte objednávku a dejte v adminu „Připraveno k vyzvednutí“, po převzetí peněz „Platba dorazila“.`
          : `Sklad je u položek už snížený. Až platba s VS ${order.variableSymbol} dorazí na účet, dejte v adminu „Platba dorazila“.`,
      },
    ],
  };
}

/** What comes after a payment: a cash payment is taken as the order is picked up. */
function afterPaymentText(order: PlacedOrder): string | undefined {
  if (isCash(order)) return undefined;
  return isPickup(order)
    ? 'Až bude připravená k vyzvednutí, dáme vám vědět.'
    : 'Teď ji balíme a ozveme se, až bude na cestě.';
}

/** How a cancelled order's money comes back: by transfer, or as agreed for cash. */
function refundText(order: PlacedOrder): string | undefined {
  if (order.paymentStatus === 'paid') {
    return isCash(order)
      ? `Zaplacenou částku ${formatCzk(order.totalAmount)} vám vrátíme, ozveme se, jak vám ji předáme.`
      : `Zaplacenou částku ${formatCzk(order.totalAmount)} vám vrátíme na účet, ze kterého platba přišla.`;
  }
  // Nothing was paid in cash yet; a transfer may be on its way.
  return isCash(order)
    ? undefined
    : 'Pokud jste ji mezitím zaplatili, peníze vám vrátíme na účet, ze kterého platba přišla.';
}

/** The parts of an action's e-mail made from the order, after the admin's text. */
type ActionBlocks = (order: PlacedOrder, details: ActionDetails) => EmailBlock[];

/** The order actions that e-mail the customer, one template each; `mark-delivered` has none. */
export type ActionEmailKey = Exclude<EmailTemplateKey, 'order-received' | 'new-order'>;

const ACTION_BLOCKS: Record<ActionEmailKey, ActionBlocks> = {
  'mark-paid': (order, { message }) => [
    ...paragraphs(afterPaymentText(order)),
    ...noteBlocks(message),
    itemsBlock(order),
  ],

  ship: (order, { message, trackingNumber, trackingUrl }) => [
    ...(trackingNumber
      ? [{ kind: 'facts', rows: [['Číslo zásilky', trackingNumber]] } satisfies EmailBlock]
      : []),
    ...(trackingUrl
      ? [{ kind: 'button', label: 'Sledovat zásilku', href: trackingUrl } satisfies EmailBlock]
      : []),
    ...noteBlocks(message),
    destinationBlock(order),
    ...paragraphs(collectingText(order)),
  ],

  // The admin's message says where and when; without one the customer is asked to arrange it.
  'ready-for-pickup': (order, { message }) => [
    ...(message?.trim()
      ? noteBlocks(message)
      : paragraphs('Odpovězte prosím na tento e-mail a domluvíme se, kde a kdy si ji vyzvednete.')),
    ...(isCash(order) && order.paymentStatus !== 'paid'
      ? [
          {
            kind: 'facts',
            rows: [['Zaplatíte hotově při převzetí', formatCzk(order.totalAmount)]],
          } satisfies EmailBlock,
        ]
      : []),
  ],

  cancel: (order, { message }) => [...noteBlocks(message), ...paragraphs(refundText(order))],

  'mark-refunded': (order, { message }) => [
    ...paragraphs(
      isCash(order)
        ? undefined
        : 'Peníze jsme poslali na účet, ze kterého platba přišla; obvykle je tam uvidíte do dvou pracovních dnů.'
    ),
    ...noteBlocks(message),
  ],
};

/** The customer's e-mail about an action: the admin's text, then the parts made from the order. */
export function orderActionEmail(
  action: ActionEmailKey,
  order: PlacedOrder,
  details: ActionDetails,
  text: EmailText
): EmailContent {
  const { subject, title, intro } = fillText(text, order, details);
  return { subject, title, blocks: [...intro, ...ACTION_BLOCKS[action](order, details)] };
}
