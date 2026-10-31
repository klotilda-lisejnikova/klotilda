# TypeScript: the API and the domain package

Adopted from the open-procurement TypeScript backend guide (2026-10-31), reduced to what fits
`apps/api` and `packages/domain`. Extends [`../CLAUDE.md`](../CLAUDE.md) and
[`../design-patterns.md`](../design-patterns.md); only stack-specific rules are listed here. Where the code
already has a consistent practice, the practice is written down rather than replaced.

## Module and folder organization

**First the scope, then the responsibility.**

- **`packages/domain`** holds what is true of the shop independent of any runtime: entity declarations
  (`entities/<name>/fields.ts` + `index.ts`), workflows (`entities/order/workflow.ts`), constants, DTO types
  and the typed clients. No Node or DOM APIs (ESLint enforces it). A rule both the API and an app need
  belongs here, once.
- **`apps/api/src`** is organized **one folder per unit of work** (`checkout/`, `orders/`, `catalogue/`,
  `emails/`, `files/`, `web/`), its implementation and directly related files colocated.
  `app-config.ts` is the composition root that wires them into be-core; a feature folder does not import
  from `app-config.ts`.
- A new top-level area gets a new folder; a file at the root of `src/` is either the composition root
  (`app-config.ts`, `index.ts`, `env.ts`, `models-registry.ts`) or an integration test.
- Both packages are ESM (`"type": "module"`); follow the import style of the file next to yours.

## Naming conventions

- File names: `kebab-case.ts` (`checkout-plugin.ts`, `read-checkout-request.ts`). No `PascalCase` or
  `camelCase` file names.
- Types and interfaces: `PascalCase`. Functions and variables: `camelCase`. Constants that configure
  behaviour: `UPPER_SNAKE_CASE` (`SHIPPING_PRICES`, `CHECKOUT_RATE_LIMIT`).
- Prefer function declarations for named operations; reserve arrow functions for inline callbacks and
  short transforms.
- Array types are written `T[]`, as the code already does.
- Naming by intent (`design-patterns.md`): `resolve*` computes, `get*` is a pure accessor, `find*` may
  return `undefined`.

## Testing

- **Vitest** everywhere.
- A test sits **next to the tested file**: `<subject>.test.ts` for a unit test,
  `<subject>.integration.test.ts` for one that needs Postgres (`TEST_DATABASE_URL`, the CI service). The
  API's whole-app integration tests sit at `src/` root and build the app through `test-support/test-app.ts`.
- A new route or domain rule ships with a test covering at least its validation and its success and error
  branches; a refusal is asserted by its status **and** its message (`prove-red`).
- A model change ships with its migration; `migrations.integration.test.ts` is the guard that a migrated
  schema equals a `sync()`ed one.

## API and validation

- Entity CRUD comes from `defineEntity` + be-core; don't hand-write a route that repeats it
  (`design-patterns.md` → _Unify cross-cutting contract concerns_).
- A route that is not plain CRUD (the checkout, the order actions) validates its input explicitly at the
  edge (`read-checkout-request.ts` is the pattern) and answers a `400` with a message naming the field.
- Money, stock and order state change inside one transaction, with the rows they depend on locked
  (`FOR UPDATE`), as the checkout does.

## Errors and logging

- Throw errors, not strings. A failure the request can survive (an e-mail, the web revalidation) is
  logged with `console.error` naming what failed, and the request goes on; anything else propagates.
- Errors should never pass silently (`design-patterns.md` → _Zen_): no empty `catch`.
