---
name: feature-plans
description: Everything under features/ — plans, epics and workstreams, reviews and the epic backlog. Use whenever the conversation is about a todo, a plan, a feature (to plan, park, pick up, ship or archive), a review (writing one, attaching it to a plan, or turning it into a todo), a backlog ("note it in the backlog"), an epic or workstream, "save this for later", "follow-up", "out of scope for now" — in any language of the conversation. Carries the layout (features/<date>-<slug>/ with status in the file) and the features.sh tool.
---

# Feature plans

`features/` holds **forward-looking design notes, refactor plans and reviews** — work that has been thought
through, whether or not it is being implemented right now. It is versioned in the repository so any developer
and any Claude Code session sees the same queue. Adopted from the open-procurement workspace (2026-10-31);
Klotilda has no ticket tracker, so every `**Ticket:**` is `none yet` unless the owner names one.

## Layout

```
features.sh                               the tool (repository root)
features/<date>-<slug>/README.md          the feature: H1, **Ticket:**, **Status:**, then its plan
features/<date>-<slug>/<date>-<ws>.md     optional: any other top-level .md carrying a **Status:** is a workstream
features/<date>-<slug>/backlog.md         optional: the epic backlog
features/<date>-<slug>/review/            optional: this feature's reviews, one per file: <YYYY-MM-DD>-<subject>.md
features/<date>-<slug>/resources/         optional: specs, SQL, prototypes, verbatim sources
reviews/<YYYY-MM-DD>-<subject>.md         reviews not (yet) attached to any feature
```

- **Names carry the creation date**, which never changes, so a listing reads in creation order. `features.sh
new` adds it; a workstream file is named so by hand.
- **A feature is a directory from the day it is created**, so it can grow workstreams, resources and reviews
  without being restructured.
- **The slug is kebab-case and stable.** Renaming only through `./features.sh rename <old> <new>`, which moves
  the directory and rewrites the links into it.
- **Reserved names** inside a plan: `README.md`, `review/`, `backlog.md`, `resources/`. Never workstreams.
- **Status lives in the file, not in a directory.** A plan never moves after it is created.

**Status vocabulary** — one for plans and workstreams. The first word is the value; free text may follow it:

| status     | meaning                                                                             |
| ---------- | ----------------------------------------------------------------------------------- |
| `design`   | being designed, not approved                                                        |
| `planned`  | approved or parked, waiting to be picked up                                         |
| `active`   | being implemented                                                                   |
| `deferred` | deliberately on hold                                                                |
| `shipped`  | done: `shipped (YYYY-MM-DD)`                                                        |
| `archived` | no longer worth reading: `archived — shipped (…)` or `archived — dropped: <reason>` |

## features.sh

| command                                         | does                                                                                           |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `./features.sh`                                 | the listing: OPEN, SHIPPED, unattached reviews; `--detailed`, `--show-archived`, `--hide-done` |
| `./features.sh new <slug> [--status WORD]`      | scaffold `features/<today>-<slug>/README.md` (default status `design`)                         |
| `./features.sh new <slug> --review`             | scaffold `reviews/<today>-<slug>.md`                                                           |
| `./features.sh new <slug> --from-review <file>` | a feature created from an unattached review                                                    |
| `./features.sh rename <old> <new>`              | move a feature and rewrite the links pointing at it                                            |
| `./features.sh check-links [path…]`             | dangling links and anchors in `features/`, `reviews/`, `CLAUDE.md`, `README.md`                |
| `./features.sh due-survey`                      | which open epics are due an architecture survey                                                |

It needs Python 3, reads only tracked files, writes only for `new` / `rename` (with `git mv`) and never
commits. Every listing also warns on an unknown status, a directory without `README.md` and dangling links.

## Creating a plan

1. **Working on an epic, a new plan belongs to that epic** — a workstream file of it — unless the owner says
   otherwise.
2. **Look for an existing home before creating one.** If a plan already covers the subject, propose extending
   it (a workstream, a backlog line, a review section) instead.
3. **Scaffold with `./features.sh new`**, not by hand, so every plan starts in the same shape; set
   `**Ticket:** none yet` (the scaffold writes it).

**Saving** — "save this for later", _next time_, _out of scope for now_, _follow-up_ — is creating a feature:
`./features.sh new <slug> --status planned` with the design as its body; tell the owner the path. Never memory
(it rots silently) and never a personal plans folder.

## Reviews

- **One review per file, `<YYYY-MM-DD>-<subject>.md`**, in the plan's `review/` or, with no plan yet, in
  `reviews/` (`./features.sh new <subject> --review`). A re-review is a new file.
- **Header**: `# <Subject> — review YYYY-MM-DD`, then a link back to the plan it reviews.
- **Findings carry stable ids** (`H1`, `M7`) usable as anchors; a fixed one is marked **FIXED** `<short-sha>`
  in place. The review file is both the detail and the remediation ledger.
- **Attaching** an unattached review: `git mv reviews/<date>-<x>.md features/<slug>/review/<date>-<x>.md` in a
  commit of its own.

### The finding → backlog → plan lifecycle

A review that ends as a document is wasted. One entry per finding, rewritten in place as it matures:

1. **The review holds the detail** — file:line, rule violated, why it matters, suggested fix.
2. **A finding not fixed in the follow-up becomes a one-line backlog entry** under the right workstream,
   linking the review anchor: `- **OPEN (review H2):** <what> → [review](review/<date>-<x>.md#h2)`.
3. **When picked up, that entry is rewritten in place as a plan** — decision, approach, steps. Then implement.
4. **After it ships the entry becomes the as-built record**, and the finding is marked **FIXED** `<short-sha>`.

## Epics and workstreams

**An epic is a plan with workstream files** — top-level `.md` files beside `README.md` that carry a
`**Status:**`. Promoting a plan to an epic is adding its first workstream file: nothing moves, no link breaks.
Trigger: the plan's sections stop being scannable, the file passes roughly a thousand lines, or two strands are
edited in the same week. A workstream is long-lived and re-opened by editing its Status word.

**The epic backlog** (`features/<epic>/backlog.md`) holds what nobody has yet decided the home of, one dated
line per item: `- **OPEN (<source>, YYYY-MM-DD):** <what> → <link>`. A plain plan has none; "note it in the
backlog" outside an epic means ask.

## Authoring conventions

- **Header** — the title, then `**Ticket:**` and `**Status:**`. Plain markdown, no frontmatter.
- **Links are relative to the linking file**; because plans never move, they stay valid.
- **English**, as everything written down (`conventions.md`); a verbatim Czech source goes in `resources/`
  under a `> **Provenance.**` note.

## Implementation flow

1. **Plan**, then write it to the plan. Before presenting it as ready to approve, run the **design-closure
   gate** — `architecture-reviewer` over the plan — and fold the surviving findings in.
2. **The owner approves.** Set `**Status:** active`.
3. **Implement**; a mid-flight design change edits the plan.
4. **Verify, and know which kind you have.** _Tests green_ and _verified_ are different claims: exercise the
   feature end to end, and say so when that is blocked. **Prove every new guard red** (`prove-red`).
5. **Review — the pre-commit gate:** `convention-reviewer` and an adversarial reviewer (`adversarial-review`),
   in parallel, after the tests are green. Triage, fix, re-run, then commit.
6. **Fold the as-built back** into an `## Implementation` section: what was built, the delta from the design,
   and **what is NOT done, with the reason.**
7. **Ship:** `**Status:** shipped (YYYY-MM-DD)`. Flipping an **epic's** `README.md` to shipped is the
   **epic-closure gate** — a final `architecture-reviewer` survey first.
