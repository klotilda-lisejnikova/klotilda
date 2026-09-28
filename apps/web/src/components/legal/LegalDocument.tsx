import { Fragment, type ReactNode } from "react";
import { Link } from "@/i18n/navigation";

/**
 * The legal pages' text: a small subset of Markdown, enough for terms and a form, with no
 * dependency. Blocks are separated by a blank line:
 *
 *   ## Heading {#anchor}      ### Subheading
 *   - list item               1. numbered item
 *   > a note set apart
 *   anything else: a paragraph; its lines keep their breaks (addresses, the form)
 *
 * Inline: **bold** and [label](/path or https://…). React escapes everything else.
 */

const INLINE = /\*\*(.+?)\*\*|\[(.+?)\]\((.+?)\)/g;
const LOCALE_PREFIX = /^\/(cs|en)\//;

function inline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    const [whole, bold, label, href] = match;
    if (match.index > last) nodes.push(text.slice(last, match.index));
    if (bold !== undefined) {
      nodes.push(
        <strong key={match.index} className="font-medium text-stone-800">
          {bold}
        </strong>,
      );
    } else if (href.startsWith("/")) {
      // `/cs/…` points at the other language's page; any other path stays in this one.
      const other = href.match(LOCALE_PREFIX);
      nodes.push(
        <Link
          key={match.index}
          href={other ? href.slice(other[0].length - 1) : href}
          locale={other?.[1]}
          className="text-moss underline underline-offset-2"
        >
          {label}
        </Link>,
      );
    } else {
      const external = href.startsWith("http");
      nodes.push(
        <a
          key={match.index}
          href={href}
          className="text-moss underline underline-offset-2"
          {...(external && { target: "_blank", rel: "noopener noreferrer" })}
        >
          {label}
        </a>,
      );
    }
    last = match.index + whole.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/** Lines of a paragraph, with their breaks. */
function lines(block: string[]): ReactNode[] {
  return block.map((line, index) => (
    <Fragment key={index}>
      {index > 0 && <br />}
      {inline(line)}
    </Fragment>
  ));
}

const HEADING_ID = /\s*\{#([\w-]+)\}\s*$/;

function renderBlock(block: string[], key: number): ReactNode {
  const first = block[0];
  if (first.startsWith("## ")) {
    const id = first.match(HEADING_ID)?.[1];
    return (
      <h2
        key={key}
        id={id}
        className="mt-12 mb-4 scroll-mt-24 font-serif text-xl font-light tracking-[0.06em] text-stone-800 md:text-2xl"
      >
        {inline(first.slice(3).replace(HEADING_ID, ""))}
      </h2>
    );
  }
  if (first.startsWith("### ")) {
    return (
      <h3 key={key} className="mt-6 mb-2 font-medium text-stone-800">
        {inline(first.slice(4))}
      </h3>
    );
  }
  if (block.every((line) => line.startsWith("- "))) {
    return (
      <ul
        key={key}
        className="mb-4 list-disc space-y-1.5 pl-5 leading-relaxed text-stone-600"
      >
        {block.map((line, index) => (
          <li key={index}>{inline(line.slice(2))}</li>
        ))}
      </ul>
    );
  }
  if (block.every((line) => /^\d+\. /.test(line))) {
    return (
      <ol
        key={key}
        className="mb-4 list-decimal space-y-1.5 pl-5 leading-relaxed text-stone-600"
      >
        {block.map((line, index) => (
          <li key={index}>{inline(line.replace(/^\d+\. /, ""))}</li>
        ))}
      </ol>
    );
  }
  if (block.every((line) => line.startsWith("> "))) {
    return (
      <p
        key={key}
        className="border-moss bg-paper mb-6 border-l-2 px-4 py-3 text-sm leading-relaxed text-stone-600"
      >
        {lines(block.map((line) => line.slice(2)))}
      </p>
    );
  }
  return (
    <p key={key} className="mb-4 leading-relaxed text-stone-600">
      {lines(block)}
    </p>
  );
}

export default function LegalDocument({ source }: { source: string }) {
  const blocks = source
    .trim()
    .split(/\n\s*\n/)
    .map((block) => block.split("\n").map((line) => line.trimEnd()));
  return <div className="max-w-none">{blocks.map(renderBlock)}</div>;
}
