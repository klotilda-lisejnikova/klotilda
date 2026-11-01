import { Fragment, type ReactNode } from "react";
import { parseLegalText } from "@klotilda/domain";
import type { InlineLine, InlineSpan, LegalBlock } from "@klotilda/domain";
import { Link } from "@/i18n/navigation";

/**
 * A legal text (the domain's Markdown subset, `parseLegalText`) in the site's type. React escapes
 * every piece of text.
 */

const LOCALE_PREFIX = /^\/(cs|en)\//;

function renderSpan(span: InlineSpan, key: number): ReactNode {
  if (span.kind === "text") return <Fragment key={key}>{span.text}</Fragment>;
  if (span.kind === "bold") {
    return (
      <strong key={key} className="font-medium text-stone-800">
        {span.text}
      </strong>
    );
  }
  if (span.href.startsWith("/")) {
    // `/cs/…` points at the other language's page; any other path stays in this one.
    const other = span.href.match(LOCALE_PREFIX);
    return (
      <Link
        key={key}
        href={other ? span.href.slice(other[0].length - 1) : span.href}
        locale={other?.[1]}
        className="text-moss underline underline-offset-2"
      >
        {span.label}
      </Link>
    );
  }
  const external = span.href.startsWith("http");
  return (
    <a
      key={key}
      href={span.href}
      className="text-moss underline underline-offset-2"
      {...(external && { target: "_blank", rel: "noopener noreferrer" })}
    >
      {span.label}
    </a>
  );
}

const inline = (line: InlineLine) => line.map(renderSpan);

/** Lines of a paragraph, with their breaks. */
function lines(block: InlineLine[]): ReactNode[] {
  return block.map((line, index) => (
    <Fragment key={index}>
      {index > 0 && <br />}
      {inline(line)}
    </Fragment>
  ));
}

function renderBlock(block: LegalBlock, key: number): ReactNode {
  switch (block.kind) {
    case "heading":
      return block.level === 2 ? (
        <h2
          key={key}
          id={block.id}
          className="mt-12 mb-4 scroll-mt-24 font-serif text-xl font-light tracking-[0.06em] text-stone-800 md:text-2xl"
        >
          {inline(block.spans)}
        </h2>
      ) : (
        <h3 key={key} className="mt-6 mb-2 font-medium text-stone-800">
          {inline(block.spans)}
        </h3>
      );
    case "list": {
      const List = block.ordered ? "ol" : "ul";
      return (
        <List
          key={key}
          className={`mb-4 ${block.ordered ? "list-decimal" : "list-disc"} space-y-1.5 pl-5 leading-relaxed text-stone-600`}
        >
          {block.items.map((item, index) => (
            <li key={index}>{inline(item)}</li>
          ))}
        </List>
      );
    }
    case "note":
      return (
        <p
          key={key}
          className="border-moss bg-paper mb-6 border-l-2 px-4 py-3 text-sm leading-relaxed text-stone-600"
        >
          {lines(block.lines)}
        </p>
      );
    case "paragraph":
      return (
        <p key={key} className="mb-4 leading-relaxed text-stone-600">
          {lines(block.lines)}
        </p>
      );
  }
}

export default function LegalDocument({ source }: { source: string }) {
  return (
    <div className="max-w-none">{parseLegalText(source).map(renderBlock)}</div>
  );
}
