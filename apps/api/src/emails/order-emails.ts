import { COMPLAINTS_ANCHOR, LEGAL_PATHS, TERMS_EFFECTIVE_FROM } from '@klotilda/domain';
import type {
  OrderAction,
  OrderItem,
  PaymentKind,
  PaymentStatus,
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
  paymentName: string;
  paymentKind: PaymentKind;
  paymentFee: number;
  totalAmount: number;
  variableSymbol: string;
  paymentStatus: PaymentStatus;
  items: OrderItem[];
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

const address = (order: PlacedOrder) => `${order.street}, ${order.zip} ${order.city}`;

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

/** How the customer pays a just placed order: the transfer's details, or cash at the pickup. */
function paymentBlocks(order: PlacedOrder, bankAccount: string): EmailBlock[] {
  if (isCash(order)) {
    return [
      {
        kind: 'paragraph',
        text: `Dobrý den, objednávku ${order.variableSymbol} jsme přijali a pustíme se do přípravy. Zaplatíte ji hotově při převzetí.`,
      },
      itemsBlock(order),
      { kind: 'facts', rows: [['Zaplatíte při převzetí', formatCzk(order.totalAmount)]] },
    ];
  }
  return [
    {
      kind: 'paragraph',
      text: `Dobrý den, objednávku ${order.variableSymbol} jsme přijali. Jakmile na účet dorazí platba, pustíme se do přípravy.`,
    },
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
 * To the customer, as soon as the order is placed: what they ordered and how to pay. For a
 * transfer the QR code is on the shop's confirmation page; the e-mail carries account, symbol and
 * amount as text.
 */
export function orderReceivedEmail(order: PlacedOrder, bankAccount: string): EmailContent {
  return {
    subject: isCash(order)
      ? `Objednávka ${order.variableSymbol} — přijata`
      : `Objednávka ${order.variableSymbol} — čeká na platbu`,
    title: 'Děkujeme za objednávku',
    blocks: [
      ...paymentBlocks(order, bankAccount),
      isPickup(order)
        ? {
            kind: 'paragraph',
            text: 'Až bude objednávka připravená, ozveme se, kde a kdy si ji vyzvednete.',
          }
        : { kind: 'facts', rows: [['Doručení na adresu', address(order)]] },
      {
        kind: 'paragraph',
        text: `Objednávku jste odeslali podle obchodních podmínek platných od ${TERMS_EFFECTIVE_FROM}. Zboží můžete do 14 dnů od převzetí vrátit bez udání důvodu.`,
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
export function newOrderEmail(order: PlacedOrder): EmailContent {
  return {
    subject: `Nová objednávka ${order.variableSymbol} — ${formatCzk(order.totalAmount)}`,
    title: 'Nová objednávka',
    blocks: [
      {
        kind: 'facts',
        rows: [
          ['Zákazník', `${order.customerFirstName} ${order.customerLastName}`],
          ['E-mail', order.customerEmail],
          ['Adresa', address(order)],
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

/** What a payment means for the order now: a cash payment is taken as it is picked up. */
function paidText(order: PlacedOrder): string {
  const thanks = `Děkujeme, platbu za objednávku ${order.variableSymbol} jsme přijali.`;
  if (isCash(order)) return thanks;
  return isPickup(order)
    ? `${thanks} Až bude připravená k vyzvednutí, dáme vám vědět.`
    : `${thanks} Teď ji balíme a ozveme se, až bude na cestě.`;
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

type ActionEmail = (order: PlacedOrder, details: ActionDetails) => EmailContent;

/** The customer's e-mail for each action that has one; `mark-delivered` has none. */
export const ORDER_ACTION_EMAILS: Partial<Record<OrderAction, ActionEmail>> = {
  'mark-paid': (order, { message }) => ({
    subject: `Objednávka ${order.variableSymbol} — platba dorazila`,
    title: 'Platba dorazila',
    blocks: [
      {
        kind: 'paragraph',
        text: paidText(order),
      },
      ...noteBlocks(message),
      itemsBlock(order),
    ],
  }),

  ship: (order, { message, trackingNumber, trackingUrl }) => ({
    subject: `Objednávka ${order.variableSymbol} je na cestě`,
    title: 'Zásilka je na cestě',
    blocks: [
      {
        kind: 'paragraph',
        text: `Objednávku ${order.variableSymbol} jsme odeslali (${order.shippingName}).`,
      },
      ...(trackingNumber
        ? [{ kind: 'facts', rows: [['Číslo zásilky', trackingNumber]] } satisfies EmailBlock]
        : []),
      ...(trackingUrl
        ? [{ kind: 'button', label: 'Sledovat zásilku', href: trackingUrl } satisfies EmailBlock]
        : []),
      ...noteBlocks(message),
      { kind: 'facts', rows: [['Doručení na adresu', address(order)]] },
    ],
  }),

  'ready-for-pickup': (order, { message }) => ({
    subject: `Objednávka ${order.variableSymbol} je připravená k vyzvednutí`,
    title: 'Připraveno k vyzvednutí',
    blocks: [
      {
        kind: 'paragraph',
        text: `Objednávka ${order.variableSymbol} na vás čeká.`,
      },
      ...(message?.trim()
        ? noteBlocks(message)
        : [
            {
              kind: 'paragraph',
              text: 'Odpovězte prosím na tento e-mail a domluvíme se, kde a kdy si ji vyzvednete.',
            } satisfies EmailBlock,
          ]),
      ...(isCash(order) && order.paymentStatus !== 'paid'
        ? [
            {
              kind: 'facts',
              rows: [['Zaplatíte hotově při převzetí', formatCzk(order.totalAmount)]],
            } satisfies EmailBlock,
          ]
        : []),
    ],
  }),

  cancel: (order, { message }) => ({
    subject: `Objednávka ${order.variableSymbol} byla zrušena`,
    title: 'Objednávka zrušena',
    blocks: [
      { kind: 'paragraph', text: `Objednávku ${order.variableSymbol} jsme zrušili.` },
      ...noteBlocks(message),
      ...paragraphs(refundText(order)),
    ],
  }),

  'mark-refunded': (order, { message }) => ({
    subject: `Objednávka ${order.variableSymbol} — peníze jsou na cestě zpět`,
    title: 'Vrátili jsme vám peníze',
    blocks: [
      {
        kind: 'paragraph',
        text: isCash(order)
          ? `Za zrušenou objednávku ${order.variableSymbol} jsme vám vrátili ${formatCzk(order.totalAmount)}.`
          : `Za zrušenou objednávku ${order.variableSymbol} jsme vám poslali ${formatCzk(order.totalAmount)} zpět na účet. Na účtu je uvidíte obvykle do dvou pracovních dnů.`,
      },
      ...noteBlocks(message),
    ],
  }),
};
