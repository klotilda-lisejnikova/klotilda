import {
  COMPLAINTS_ANCHOR,
  LEGAL_PATHS,
  TERMS_EFFECTIVE_FROM,
  TRACKING_URLS,
} from '@klotilda/domain';
import type { OrderAction, OrderItem, PaymentStatus, ShippingMethod } from '@klotilda/domain';
import { formatCzk } from './email-layout';
import type { EmailBlock, EmailContent } from './email-layout';

const SHIPPING_LABELS: Record<ShippingMethod, string> = {
  zasilkovna: 'Zásilkovna',
  ceska_posta: 'Česká pošta',
  osobni_odber: 'Osobní odběr v Praze',
};

/** What the e-mails about an order say. Customers know an order by its variable symbol. */
export interface PlacedOrder {
  id: string;
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  street: string;
  city: string;
  zip: string;
  shippingMethod: ShippingMethod;
  shippingPrice: number;
  totalAmount: number;
  variableSymbol: string;
  paymentStatus: PaymentStatus;
  items: OrderItem[];
}

/** What the admin added to the action. */
export interface ActionDetails {
  message?: string;
  trackingNumber?: string;
}

/** "Odeslali jsme ji …" */
const SHIPPED_WITH: Partial<Record<ShippingMethod, string>> = {
  zasilkovna: 'Zásilkovnou',
  ceska_posta: 'Českou poštou',
};

const address = (order: PlacedOrder) => `${order.street}, ${order.zip} ${order.city}`;

function itemsBlock(order: PlacedOrder): EmailBlock {
  return {
    kind: 'items',
    items: order.items,
    shipping: { label: SHIPPING_LABELS[order.shippingMethod], price: order.shippingPrice },
    total: order.totalAmount,
  };
}

const noteBlocks = (message: string | undefined): EmailBlock[] =>
  message?.trim() ? [{ kind: 'note', text: message.trim() }] : [];

/**
 * To the customer, as soon as the order is placed: what they ordered and how to pay. The QR code
 * is on the shop's confirmation page; the e-mail carries account, symbol and amount as text.
 */
export function orderReceivedEmail(order: PlacedOrder, bankAccount: string): EmailContent {
  const isPickup = order.shippingMethod === 'osobni_odber';
  return {
    subject: `Objednávka ${order.variableSymbol} — čeká na platbu`,
    title: 'Děkujeme za objednávku',
    blocks: [
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
      {
        kind: 'paragraph',
        text: 'Platit můžete i QR kódem ze stránky s potvrzením objednávky.',
      },
      isPickup
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

/** To the artist: a new order, and the symbol to look for on the bank account. */
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
        ],
      },
      itemsBlock(order),
      {
        kind: 'paragraph',
        text: `Sklad je u položek už snížený. Až platba s VS ${order.variableSymbol} dorazí na účet, dejte v adminu „Platba dorazila“.`,
      },
    ],
  };
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
        text:
          order.shippingMethod === 'osobni_odber'
            ? `Děkujeme, platbu za objednávku ${order.variableSymbol} jsme přijali. Až bude připravená k vyzvednutí, dáme vám vědět.`
            : `Děkujeme, platbu za objednávku ${order.variableSymbol} jsme přijali. Teď ji balíme a ozveme se, až bude na cestě.`,
      },
      ...noteBlocks(message),
      itemsBlock(order),
    ],
  }),

  ship: (order, { message, trackingNumber }) => {
    const trackingUrl = trackingNumber && TRACKING_URLS[order.shippingMethod]?.(trackingNumber);
    return {
      subject: `Objednávka ${order.variableSymbol} je na cestě`,
      title: 'Zásilka je na cestě',
      blocks: [
        {
          kind: 'paragraph',
          text:
            `Objednávku ${order.variableSymbol} jsme odeslali ${SHIPPED_WITH[order.shippingMethod] ?? ''}`.trim() +
            '.',
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
    };
  },

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
    ],
  }),

  cancel: (order, { message }) => ({
    subject: `Objednávka ${order.variableSymbol} byla zrušena`,
    title: 'Objednávka zrušena',
    blocks: [
      { kind: 'paragraph', text: `Objednávku ${order.variableSymbol} jsme zrušili.` },
      ...noteBlocks(message),
      {
        kind: 'paragraph',
        text:
          order.paymentStatus === 'paid'
            ? `Zaplacenou částku ${formatCzk(order.totalAmount)} vám vrátíme na účet, ze kterého platba přišla.`
            : 'Pokud jste ji mezitím zaplatili, peníze vám vrátíme na účet, ze kterého platba přišla.',
      },
    ],
  }),

  'mark-refunded': (order, { message }) => ({
    subject: `Objednávka ${order.variableSymbol} — peníze jsou na cestě zpět`,
    title: 'Vrátili jsme vám peníze',
    blocks: [
      {
        kind: 'paragraph',
        text: `Za zrušenou objednávku ${order.variableSymbol} jsme vám poslali ${formatCzk(order.totalAmount)} zpět na účet. Na účtu je uvidíte obvykle do dvou pracovních dnů.`,
      },
      ...noteBlocks(message),
    ],
  }),
};
