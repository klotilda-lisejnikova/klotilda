# Cross-cutting conventions

Project-wide conventions that apply in any language but are **not architectural decisions** — commenting,
documentation, formatting, and code-shape rules. Architectural patterns (module shape, API contracts,
layering) live in [design-patterns.md](design-patterns.md); language- and tool-specific style lives under
[style/](style/).

## Comments state current intent, not change history

A comment — code, config, TSDoc, doc prose — describes what a thing **is for** and how it works **now**: its intent, its contract, an example of use. It does **not** carry the _history_ of how it got here — why a line was removed, "this used to be X", a past bug, or a framework quirk that no longer applies. That reasoning is worth keeping, but it belongs in the **commit message**, where `git log` / `git blame` preserve it against the exact change; left in the file it just rots.

**Why:** the code moves forward. A comment explaining _why something isn't there_ makes the next reader reason backward, and ages into misleading noise once the context shifts. What they need is "what is this for, and how do I set it" — usually an **example stanza** — not the archaeology of a deleted literal. This is the file-side complement of the commit rule ["explain WHY not WHAT"](style/git-commits.md): the _why of the change_ goes in the commit; the _what it's for_ (and the non-obvious why of the **current** design) stays in the comment.

**Worked example.** A config map (`tenant.mongo.databases`) once carried a NOTE with the full story of a framework-upgrade incident — the empty `{}` literal serialising to `""`, the missing converter, every service dying at startup. Split it by _live constraint_ vs _history_: the **live constraint** stays as a one-line guardrail (_"leave the key out — an empty `{}` won't bind"_) next to what the map is for and an example entry, because a reader editing it today still needs that do/don't; the **incident** (which upgrade, the exception, that it downed the whole platform) moves to the commit that removed the literal. Keep the constraint that still bites; drop the archaeology of how we hit it.

**No cross-file values in a comment.** Don't restate numbers or names that live in another file or scope — `// dev/stage 0.2, prod 0.1` next to a default, `// must match FooConfig.MAX_RETRIES (5)`. The other file changes, the comment doesn't, and the stale copy reads as authoritative. Describe the value's _role_ ("default when a profile enables tracing without overriding") and let the source own the number; if two values must agree, consolidate them or let a test catch the drift.

## English for everything written down — whatever language the conversation is in

All comments, TSDoc / JSDoc, commit messages, config-file comments, and documentation prose are written in **English** — regardless of the author's first language. The code outlives any one conversation and is read by people and tools that were not in it; one language keeps everything greppable, reviewable, and translatable by everyone (and by tooling). No Czech (or any other non-English) comments, even in a file one person or team predominantly owns. When you touch a file that has a non-English comment, translate it as part of the change.

**The language of the conversation does not set the language of the output.** A task discussed in Czech (or any
other language) still produces English artifacts. This is the common case here, not an edge case: the discussion
is spoken, the artifact is read later by someone who was not in it.

So English covers everything that outlives the conversation — code and identifiers, comments and TSDoc, commit
messages, config comments, documentation, plans and review files under `features/`, runbooks,
reports and hand-offs, and messages to another agent. The chat itself stays in whatever language the people in it
are speaking; only what gets written down is fixed to English.

**A verbatim extract is the first exception, and it declares itself.** Text quoted unchanged from
elsewhere may keep its original language when altering it would misrepresent its author — but it says so, in
English, at the point of quotation, under an explicit `> **Provenance.**` note. Writing new prose in another
language is not covered by this; only preserving someone's exact words is.

**User-facing text is not covered by this rule:** the admin's Czech labels and messages, the website's Czech
and English texts (next-intl), the legal pages and the e-mails to customers stay in the language their reader
reads. The rule covers what developers and agents read.

**A deliverable for a customer is written in the customer's language, and it declares itself too.** A reply
draft, or a document the customer reads, is kept in that language under a `> **Language and purpose.**` note in
English saying who it is for and whether it was sent. Everything around it — the plan, the notes on it, the
commit — stays in English.

## Credentials: use, never display

Secrets live in gitignored `.env` files (`apps/api/.env`, `apps/admin/.env.local`), in the user-level
`~/.npmrc` and in the Railway and Vercel variables. Read them to **use** them, never to **show** them:

- **Load without echoing** — `set -a; . ./apps/api/.env; set +a`, not `cat`.
- **Pass by stdin or a config fd, never argv** — `curl -K <(…)`, `docker login --password-stdin`.
  Every user on the host can read a command line from `/proc`.
- **Inspect a secrets file by keys only** — `sed 's/=.*/=<redacted>/' apps/api/.env`, or `jq`/`yq` mapping
  every value to `"<redacted>"`. Showing the shape answers "is the key there"; the value is never needed for that.
- **Never write a secret value, or any prefix of one,** into a reply, commit message, doc, review file,
  artifact, log line or another agent's prompt. Say _which_ file and key, never what is in it.
- **A delegated agent gets this rule in its prompt**, and deletes any copy of a secrets file it makes.
- **If a value is displayed anyway, say so plainly** — which secret, where — so its owner can decide about
  rotation. Don't quietly carry on.

**Why "use", not "don't read":** the tools need the values, so reading is fine. Anything a tool prints
reaches the model and stays in the local session transcript, though, whatever the reply says afterwards. So the
protection is keeping values _out of tool output_, not masking the answer. It does not hide a file from the model
provider - a file that must not leave the machine is not read at all.

## ISO dates in non-database surfaces

When emitting a date in a log line, error message, header, or doc, use **ISO 8601** (`2026-04-28`, `2026-04-28T15:00:00Z`) — never locale-dependent (`28/04/2026`, `April 28th`).

Reasoning: greppable, sortable, unambiguous across locales, machine-parseable. Database storage uses native types; this rule is for human-readable surfaces where dates leak into logs / docs / messages.

## Extract long lambda / closure bodies into named methods

> A concrete code-style consequence of the [Zen of Python design baseline](design-patterns.md#the-zen-of-python-is-the-projects-design-baseline) (_readability counts_, _flat over nested_), applied to method shape.

A lambda, anonymous function, or closure that runs more than a handful of statements should be replaced by a call to a named private method (or function).

**Rule of thumb:** if the body would not fit on a single line of intent ("for each entry, build a Line and add it to the list"), extract. Trigger threshold is roughly **5 statements** or any meaningful local logic — refactor before you cross 10.

**Bad:**

```ts
const lines = entries
  .sort((a, b) => a.name.localeCompare(b.name))
  .map((entry) => {
    const current = entry.cache.stats();
    const delta = current.minus(entry.previous);
    entry.previous = current;
    const idle = delta.requestCount === 0 && delta.evictionCount === 0;
    return { name: entry.name, hits: delta.hitCount, misses: delta.missCount, idle };
  });
```

The reader has to parse a multi-line arrow body to discover its intent: "build a line from an entry."

**Good:**

```ts
const lines = entries.sort((a, b) => a.name.localeCompare(b.name)).map(buildCacheLine);

function buildCacheLine(entry: CacheEntry): CacheLine {
  const current = entry.cache.stats();
  const delta = current.minus(entry.previous);
  entry.previous = current;
  const idle = delta.requestCount === 0 && delta.evictionCount === 0;
  return { name: entry.name, hits: delta.hitCount, misses: delta.missCount, idle };
}
```

The pipeline reads top-down as one sentence; the function's name documents the body's purpose; the body itself stays sequential and testable.

**Why:**

- A method has a name; a lambda has only its position. Names are searchable, profileable, debuggable. Stack traces show function names, not anonymous bodies.
- A pipeline of `.filter().map().reduce()` is most readable when each step is a verb-shaped reference; a multi-statement lambda forces the reader to switch out of pipeline-reading mode mid-flow.
- Methods can be unit-tested in isolation; lambda bodies can't.
- Refactor tools rename methods cleanly; renaming a lambda's captured variables is more fragile.

**When _not_ to apply:**

- Trivial 1-line bodies (`(s) => s.trim()`, `(e) => e.name`) — extracting hurts more than it helps.
- Lambdas that intentionally close over many local variables that would all need to be passed as parameters — usually a sign the _caller_ should be restructured, but extraction may be net-negative until that happens.

In a Vue `<script setup>` or a React component the same holds for an inline handler: a `computed`, `watch` or `useEffect` body that grows past a few statements becomes a named function.

Your reader should never have to parse a multi-statement closure to learn what it's _for_.

## Diagrams + text in documentation

When a feature spans multiple components, every architecture page must include **at least one Mermaid diagram** — flow, sequence, or class. Text alone hides structure; ASCII art rots; Mermaid renders consistently on GitHub.

Pair the diagram with a short text that _names the boundaries the diagram crosses_. The diagram shows the shape; the text explains why those particular pieces are separate.

**No author-added colour or style directives in Mermaid** — no `style … fill:`, `classDef`, `:::class`, `%%{init: {"themeVariables": …}}%%`, or inline `<span style>` in labels. GitHub themes Mermaid to the surrounding page; hardcoded colours override that and look wrong in light or dark mode. Features whose _default_ rendering is coloured (`note for`, `Note over`, stereotypes) are fine — the renderer chose those, not the author.

## Documentation as part of the change, not a follow-up

When you land a non-trivial change, the architecture / changelog / API docs go in the same commit or pull request — here that is chiefly `CLAUDE.md` and the READMEs. Documentation that lags the code is documentation that lies.

If the doc doesn't fit, the change is too big — split it.

- **The changelog is an index, not the source of truth.** One short paragraph per workstream plus one-line bullets, ending with a link to the architecture / development page that carries the detail; no file tables (`git log --stat` is authoritative), no rationale walls. When an entry needs more than a handful of bullets, the doc page is what needs updating first — the changelog entry then collapses to a paragraph and a reference. Behaviour-on-existing-deployments notes are only for things an operator must _act on_.
