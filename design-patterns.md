# Design patterns

Project-wide **architectural decisions** — module shape, API contracts, layering. Adopted from the
open-procurement workspace's cross-language patterns (2026-10-31), keeping the sections that apply to a
TypeScript monorepo on be-core; the Java- and platform-specific ones are left out. The project's own
load-bearing rule — an entity is declared once — is in [CLAUDE.md](CLAUDE.md).

For non-architectural rules — commenting, documentation, code shape — see [conventions.md](conventions.md);
language- and tool-specific style lives under [style/](style/).

## Vertical packaging — by feature, not by layer

Group code by what it _does_ together, not by what _kind_ of module it is.

**Bad:**

```
src/
├── routes/            ← checkout-routes.ts, order-routes.ts, …
├── services/          ← checkout-service.ts, order-service.ts, …
└── repositories/      ← order-repository.ts, product-repository.ts, …
```

**Good:**

```
apps/api/src/
├── checkout/          ← checkout-plugin.ts, qr-payment.ts, read-checkout-request.ts
├── emails/            ← order-emails.ts, email-layout.ts, escape-html.ts
└── files/             ← authorize-file-access.ts, shop-images.ts
```

**Why:** features change together; layers don't. Vertical packaging keeps related code in one place, makes deletions / extractions clean (delete the whole package), and reflects the domain. Horizontal packaging makes you grep across three folders to understand a single feature.

**Precedent in this codebase:** `apps/api/src/checkout/` holds the whole checkout — the route, the request parsing and the QR payment — and an entity's whole declaration sits in `packages/domain/src/entities/<name>/`.

## Resolution-oriented naming — `resolve*`

Methods that _compute / look up / decide_ a value go by `resolve<X>` (`resolveShippingPrice`, `resolveAvailableActions`). Avoids ambiguous `get<X>` (which suggests pure accessor) and `find<X>` (which suggests an `Optional`).

`resolve*` methods are allowed to:

- Throw if no answer can be produced.
- Consult multiple sources (security context, request, defaults).
- Cache.

Use `get<X>` only for true accessors (no computation, no I/O). Use `find<X>` only when the answer may be absent (`X | undefined`).

## Unify cross-cutting contract concerns in a shared base — drift is a defect

Every entity's REST / service surface carries concerns that are **not domain-specific** — the list envelope, the error shape, validation, access checks, default sort. These are **shared infrastructure**: implemented **once** in a shared base that every entity inherits — **never hand-rolled per route.**

**The separation:** the **domain model varies per feature; the envelope, headers, and validation handling do not.** So the moment the same concept — a page, an error, a created resource — serializes two different ways across a _single service's own_ endpoints, that is a **defect**, not a permissible variation: a client bug that surfaces far from its cause.

> **Worked incident (open-procurement's parent platform).** One service returned `totalElements` at the top level of one list endpoint and nested it under `page` on another — two hand-rolled pagings in one service. A UI list built for the nested shape read `page.totalElements`, got `undefined` from the flat endpoint, and silently showed a single page of a huge collection. The fix was one shared page envelope, not a client patch.

**Tells — stop and hoist when you see any:**

- writing envelope / error-mapping / paging code in a _second_ route;
- two endpoints returning "a page" (or an error, or a `201`) with different shapes;
- a new route copy-pasting boilerplate from an existing one.

**Practice.** Adding an entity is a declaration that _inherits_ the cross-cutting behaviour and declares only what is domain-specific. If a shared piece doesn't exist yet, **building it is step one, not a deferred cleanup.** A genuinely different contract (the checkout, the order actions) is not drift: give it its own route, but reuse the shared machinery — validation, error shape, access — rather than a second copy of it.

**Here** the shared base is be-core plus `defineEntity`: the CRUD routes, validation, error shape and access deciders come from the entity declaration (`CLAUDE.md` → _The one rule_). A hand-written route that repeats any of that for one entity is the drift this section names.

## Identity: prefer keys with no business meaning

**A primary key's job is to name a row, not to describe it.** Default to a key the business never reads:

| Shape                                                                                             | Use for                                 |
| ------------------------------------------------------------------------------------------------- | --------------------------------------- |
| **A meaningless generated value** — a UUID, or a DB counter where a short readable number matters | the default                             |
| **A business string as the key**                                                                  | rare, and it has to earn it — see below |

**Why it's a rule, not a preference:** a business-meaningful key is **permanent**, and its cost scales with
how many places carry it. It reaches public URLs; every row that links to you stores a copy of it; and there
is no in-place rename — changing it is delete-and-recreate, because saving a row under a new key inserts a second row
rather than renaming the first. Anything holding the old value as a plain string is silently
stranded. None of that is visible on the day you choose it.

Here: rows key on generated ids; a business string such as a category's `slug` is an ordinary unique column beside it, so it can change. The production table names (`Products`, `Orders`, …) are the one fixed name — see `CLAUDE.md`.

## The Zen of Python is the project's design baseline

From Tim Peters, [PEP 20](https://peps.python.org/pep-0020/) — _The Zen of Python_ (excerpt):

```
Beautiful is better than ugly.
Explicit is better than implicit.
Simple is better than complex.
Complex is better than complicated.
Flat is better than nested.
Sparse is better than dense.
Readability counts.
Special cases aren't special enough to break the rules.
Although practicality beats purity.
Errors should never pass silently.
Unless explicitly silenced.
In the face of ambiguity, refuse the temptation to guess.
There should be one — and preferably only one — obvious way to do it.
Although that way may not be obvious at first unless you're Dutch.
Now is better than never.
Although never is often better than *right* now.
If the implementation is hard to explain, it's a bad idea.
If the implementation is easy to explain, it may be a good idea.
Namespaces are one honking great idea — let's do more of those!
```

Treat the Zen of Python as a **design and style baseline** for TypeScript too, not a Python-specific aphorism. When two designs (or code shapes) seem equivalent on functionality, pick the one that scores better on _explicit, simple, flat, sparse, readable_. Most of the conventions on this page are concrete consequences of that baseline.

Worked applications across both axes:

**Design** — applies to architecture / module shape / API contracts:

- _Explicit over implicit._ Pass dependencies in (a parameter, a factory argument such as `createShopImages(models, storageAdapter, …)`); don't reach for module-level singletons or hidden globals when a parameter does the job. Decisions visible in the type system, not buried in runtime context.
- _Flat over nested._ A 4-level class hierarchy is rarely better than a 2-level one + composition.
- _One obvious way._ When two ways exist to do the same thing (e.g. a hand-written route beside the generated CRUD route for the same entity), the second one usually leaks. Collapse to one canonical path.
- _Errors should never pass silently._ Catch only when you can recover meaningfully; otherwise let the exception propagate. `try { … } catch {}` is almost always wrong.
- _Special cases aren't special enough._ Add a generic abstraction when you have two concrete users (not before, not after a tenth dirty workaround).

**Code style** — the code-shape consequences of this baseline (extract long lambda / closure bodies into named methods, and the naming rules) live in [conventions.md](conventions.md#extract-long-lambda--closure-bodies-into-named-methods).

## Don't pre-build for hypothetical futures

Three near-identical lines is better than a premature abstraction.

If you find yourself adding configuration knobs, feature flags, or extension points "for the future," stop. Add them when the future arrives. The cost of adding them later is one PR; the cost of carrying the wrong abstraction is years of ceremony.

This applies _especially_ to:

- Generic frameworks for "any kind of …" (do you have _two_ concrete users yet?).
- Configuration-driven behaviour for things only one caller varies.
- Plugin / strategy patterns for things that have one strategy.
