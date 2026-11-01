/**
 * The legal pages' text: a small subset of Markdown, enough for terms and a form. Blocks are
 * separated by a blank line:
 *
 *   ## Heading {#anchor}      ### Subheading
 *   - list item               1. numbered item
 *   > a note set apart
 *   anything else: a paragraph; its lines keep their breaks (addresses, the form)
 *
 * Inline: **bold** and [label](/path or https://…). Parsed into plain data; whoever renders it
 * (the website) escapes the text itself.
 */

export type InlineSpan =
  | { kind: 'text'; text: string }
  | { kind: 'bold'; text: string }
  | { kind: 'link'; label: string; href: string };

/** One line of text, as its spans. */
export type InlineLine = InlineSpan[];

export type LegalBlock =
  | { kind: 'heading'; level: 2 | 3; id?: string; spans: InlineLine }
  | { kind: 'list'; ordered: boolean; items: InlineLine[] }
  | { kind: 'note'; lines: InlineLine[] }
  | { kind: 'paragraph'; lines: InlineLine[] };

const INLINE = /\*\*(.+?)\*\*|\[(.+?)\]\((.+?)\)/g;
const HEADING_ID = /\s*\{#([\w-]+)\}\s*$/;
const ORDERED_ITEM = /^\d+\. /;

/** A line's bold parts and links, the rest as text. */
function parseInline(text: string): InlineLine {
  const spans: InlineLine = [];
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    const [whole, bold, label, href] = match;
    if (match.index > last) spans.push({ kind: 'text', text: text.slice(last, match.index) });
    spans.push(
      bold !== undefined
        ? { kind: 'bold', text: bold }
        : { kind: 'link', label: label ?? '', href: href ?? '' }
    );
    last = match.index + whole.length;
  }
  if (last < text.length) spans.push({ kind: 'text', text: text.slice(last) });
  return spans;
}

function parseBlock(lines: string[]): LegalBlock {
  const first = lines[0] ?? '';
  if (first.startsWith('## ')) {
    const id = first.match(HEADING_ID)?.[1];
    const spans = parseInline(first.slice(3).replace(HEADING_ID, ''));
    return id ? { kind: 'heading', level: 2, id, spans } : { kind: 'heading', level: 2, spans };
  }
  if (first.startsWith('### '))
    return { kind: 'heading', level: 3, spans: parseInline(first.slice(4)) };
  if (lines.every((line) => line.startsWith('- '))) {
    return { kind: 'list', ordered: false, items: lines.map((line) => parseInline(line.slice(2))) };
  }
  if (lines.every((line) => ORDERED_ITEM.test(line))) {
    const items = lines.map((line) => parseInline(line.replace(ORDERED_ITEM, '')));
    return { kind: 'list', ordered: true, items };
  }
  if (lines.every((line) => line.startsWith('> '))) {
    return { kind: 'note', lines: lines.map((line) => parseInline(line.slice(2))) };
  }
  return { kind: 'paragraph', lines: lines.map(parseInline) };
}

/** The text as blocks, in order. */
export function parseLegalText(source: string): LegalBlock[] {
  const trimmed = source.trim();
  if (!trimmed) return [];
  return trimmed
    .split(/\n\s*\n/)
    .map((block) => block.split('\n').map((line) => line.trimEnd()))
    .map(parseBlock);
}
