import type { OrderItem, ShippingMethod } from '@klotilda/domain';
import { escapeHtml } from './escape-html';

const SHIPPING_LABELS: Record<ShippingMethod, string> = {
  zasilkovna: 'Zásilkovna',
  ceska_posta: 'Česká pošta',
  osobni_odber: 'Osobní odběr',
};

/** What both e-mails about a new order say. */
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
  items: OrderItem[];
}

export interface EmailMessage {
  subject: string;
  html: string;
}

const formatCzk = (amount: number) => `${amount.toLocaleString('cs-CZ')} Kč`;

function describeAddress(order: PlacedOrder): string {
  return escapeHtml(`${order.street}, ${order.zip} ${order.city}`);
}

function describeItems(items: OrderItem[]): string {
  return items
    .map(
      (item) => `<tr>
          <td style="padding:4px 8px">${escapeHtml(item.name)}</td>
          <td style="padding:4px 8px">${item.quantity}×</td>
          <td style="padding:4px 8px">${formatCzk(item.price)}</td>
        </tr>`
    )
    .join('');
}

/**
 * To the customer, as soon as the order is placed: what they ordered and how to pay. The QR code
 * is on the shop's confirmation page; the e-mail carries account, symbol and amount as text.
 */
export function orderReceivedEmail(order: PlacedOrder, bankAccount: string): EmailMessage {
  return {
    subject: `Objednávka ${order.id} přijata — čeká se na platbu`,
    html: `
      <h2>Děkujeme za vaši objednávku!</h2>
      <p>Číslo objednávky: <strong>${escapeHtml(order.id)}</strong></p>
      <table border="0" cellspacing="0">
        <thead>
          <tr>
            <th style="padding:4px 8px;text-align:left">Produkt</th>
            <th style="padding:4px 8px;text-align:left">Ks</th>
            <th style="padding:4px 8px;text-align:left">Cena</th>
          </tr>
        </thead>
        <tbody>${describeItems(order.items)}</tbody>
      </table>
      <p>Doprava: ${SHIPPING_LABELS[order.shippingMethod]} (${formatCzk(order.shippingPrice)})</p>
      <p><strong>Celkem: ${formatCzk(order.totalAmount)}</strong></p>
      <p>Adresa doručení: ${describeAddress(order)}</p>
      <h3>Platební údaje</h3>
      <p>
        Prosím uhraďte částku převodem nebo naskenováním QR kódu na stránce s potvrzením objednávky.
        <br />Číslo účtu: <strong>${escapeHtml(bankAccount)}</strong>
        <br />Variabilní symbol: <strong>${order.variableSymbol}</strong>
        <br />Částka: <strong>${formatCzk(order.totalAmount)}</strong>
      </p>
      <p>Po přijetí platby vaši objednávku zpracujeme a o odeslání zásilky vás budeme informovat.</p>
    `,
  };
}

/** To the artist: a new order, and the symbol to look for on the bank account. */
export function newOrderEmail(order: PlacedOrder): EmailMessage {
  const customer = `${order.customerFirstName} ${order.customerLastName} (${order.customerEmail})`;
  const items = order.items.map((item) => `${item.name} ×${item.quantity}`).join(', ');
  return {
    subject: `Nová objednávka ${order.id} — čeká na platbu (VS ${order.variableSymbol})`,
    html: `
      <h2>Nová objednávka</h2>
      <p>Objednávka: <strong>${escapeHtml(order.id)}</strong> · VS: <strong>${order.variableSymbol}</strong></p>
      <p>Zákazník: ${escapeHtml(customer)}</p>
      <p>Položky: ${escapeHtml(items)}</p>
      <p>Celkem: ${formatCzk(order.totalAmount)}</p>
      <p>Doprava: ${SHIPPING_LABELS[order.shippingMethod]}</p>
      <p>Adresa: ${describeAddress(order)}</p>
      <p>Sklad byl u položek objednávky již snížen. Až platba dorazí na účet (hledejte VS ${order.variableSymbol}), označte objednávku v adminu jako zaplacenou.</p>
    `,
  };
}
