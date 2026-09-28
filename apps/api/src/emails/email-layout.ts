import { SELLER_LINE } from '@klotilda/domain';
import { escapeHtml } from './escape-html';

/**
 * An e-mail is a title and a few blocks; each renders as HTML in the site's colours and as plain
 * text, so every message goes out in both forms and reads the same in either.
 */
export type EmailBlock =
  | { kind: 'paragraph'; text: string }
  /** Label–value lines, e.g. the payment details. */
  | { kind: 'facts'; rows: [label: string, value: string][] }
  | {
      kind: 'items';
      items: { name: string; quantity: number; price: number }[];
      shipping: { label: string; price: number };
      total: number;
    }
  /** The admin's own words to the customer, set apart. */
  | { kind: 'note'; text: string }
  | { kind: 'button'; label: string; href: string }
  /** Small links under the rest, e.g. the terms. A path (`/obchodni-podminky`) is on the site. */
  | { kind: 'links'; links: { label: string; href: string }[] };

export interface EmailContent {
  subject: string;
  title: string;
  blocks: EmailBlock[];
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

/** The web's palette (`apps/web/src/app/globals.css`). */
const COLORS = {
  paper: '#f5efe6',
  card: '#fafaf8',
  ink: '#292524',
  muted: '#78716c',
  line: '#e7e5e4',
  moss: '#567042',
};
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "'Helvetica Neue', Arial, sans-serif";
const SITE_NAME = 'KLOTILDA';

export const formatCzk = (amount: number) => `${amount.toLocaleString('cs-CZ')} Kč`;

/** Line breaks the admin typed survive into the HTML. */
const htmlText = (text: string) => escapeHtml(text).replace(/\r?\n/g, '<br />');

/** A site path made absolute; full URLs stay as they are. */
const onSite = (href: string, siteUrl: string) =>
  href.startsWith('/') ? `${siteUrl.replace(/\/$/, '')}${href}` : href;

function blockHtml(block: EmailBlock, siteUrl: string): string {
  switch (block.kind) {
    case 'links':
      return `<p style="margin:8px 0 0;font-size:13px;line-height:1.8">${block.links
        .map(
          (link) =>
            `<a href="${escapeHtml(onSite(link.href, siteUrl))}" style="color:${COLORS.moss}">${escapeHtml(link.label)}</a>`
        )
        .join(' &nbsp;·&nbsp; ')}</p>`;
    case 'paragraph':
      return `<p style="margin:0 0 16px;line-height:1.6">${htmlText(block.text)}</p>`;
    case 'facts':
      return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 20px;font-size:14px">${block.rows
        .map(
          ([label, value]) =>
            `<tr><td style="padding:3px 16px 3px 0;color:${COLORS.muted}">${escapeHtml(label)}</td><td style="padding:3px 0;font-weight:bold">${escapeHtml(value)}</td></tr>`
        )
        .join('')}</table>`;
    case 'items': {
      const cell = `padding:8px 0;border-bottom:1px solid ${COLORS.line}`;
      const rows = block.items
        .map(
          (item) =>
            `<tr><td style="${cell}">${escapeHtml(item.name)}${item.quantity > 1 ? ` <span style="color:${COLORS.muted}">× ${item.quantity}</span>` : ''}</td><td style="${cell};text-align:right;white-space:nowrap">${formatCzk(item.price * item.quantity)}</td></tr>`
        )
        .join('');
      return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;font-size:14px">${rows}
        <tr><td style="${cell};color:${COLORS.muted}">Doprava — ${escapeHtml(block.shipping.label)}</td><td style="${cell};text-align:right;color:${COLORS.muted}">${formatCzk(block.shipping.price)}</td></tr>
        <tr><td style="padding:10px 0;font-weight:bold">Celkem</td><td style="padding:10px 0;text-align:right;font-weight:bold">${formatCzk(block.total)}</td></tr>
      </table>`;
    }
    case 'note':
      return `<p style="margin:0 0 20px;padding:12px 16px;border-left:3px solid ${COLORS.moss};background:${COLORS.paper};line-height:1.6">${htmlText(block.text)}</p>`;
    case 'button':
      return `<p style="margin:4px 0 24px"><a href="${escapeHtml(block.href)}" style="display:inline-block;padding:11px 22px;background:${COLORS.moss};color:#ffffff;text-decoration:none;font-size:13px;letter-spacing:2px;text-transform:uppercase">${escapeHtml(block.label)}</a></p>`;
  }
}

function blockText(block: EmailBlock, siteUrl: string): string {
  switch (block.kind) {
    case 'links':
      return block.links.map((link) => `${link.label}: ${onSite(link.href, siteUrl)}`).join('\n');
    case 'paragraph':
      return block.text;
    case 'facts':
      return block.rows.map(([label, value]) => `${label}: ${value}`).join('\n');
    case 'items':
      return [
        ...block.items.map(
          (item) =>
            `${item.name}${item.quantity > 1 ? ` × ${item.quantity}` : ''} — ${formatCzk(item.price * item.quantity)}`
        ),
        `Doprava — ${block.shipping.label}: ${formatCzk(block.shipping.price)}`,
        `Celkem: ${formatCzk(block.total)}`,
      ].join('\n');
    case 'note':
      return block.text
        .split(/\r?\n/)
        .map((line) => `> ${line}`)
        .join('\n');
    case 'button':
      return `${block.label}: ${block.href}`;
  }
}

/** The message in both forms; `siteUrl` is linked in the footer. */
export function renderEmail(content: EmailContent, siteUrl: string): RenderedEmail {
  const site = siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const html = `<!doctype html>
<html lang="cs"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width" /><title>${escapeHtml(content.subject)}</title></head>
<body style="margin:0;padding:0;background:${COLORS.paper}">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${COLORS.paper}">
    <tr><td align="center" style="padding:32px 16px">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px">
        <tr><td style="padding:0 0 20px;text-align:center;font-family:${SERIF};font-size:18px;letter-spacing:6px;color:${COLORS.ink}">${SITE_NAME}</td></tr>
        <tr><td style="background:${COLORS.card};padding:32px 28px;font-family:${SANS};font-size:15px;color:${COLORS.ink}">
          <h1 style="margin:0 0 20px;font-family:${SERIF};font-size:24px;font-weight:normal;letter-spacing:1px">${escapeHtml(content.title)}</h1>
          ${content.blocks.map((block) => blockHtml(block, siteUrl)).join('\n')}
        </td></tr>
        <tr><td style="padding:20px 0 0;text-align:center;font-family:${SANS};font-size:12px;line-height:1.6;color:${COLORS.muted}">
          Na tento e-mail můžete rovnou odpovědět.<br />
          <a href="${escapeHtml(siteUrl)}" style="color:${COLORS.muted}">${escapeHtml(site)}</a><br />
          Prodávající: ${escapeHtml(SELLER_LINE)}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  const text = [
    SITE_NAME,
    '',
    content.title,
    '',
    ...content.blocks.map((block) => `${blockText(block, siteUrl)}\n`),
    '—',
    'Na tento e-mail můžete rovnou odpovědět.',
    siteUrl,
    `Prodávající: ${SELLER_LINE}`,
  ].join('\n');
  return { subject: content.subject, html, text };
}
