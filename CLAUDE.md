# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

**Klotilda** — the website and e-shop of an artist (klotilda.cz): ceramics, embroidery and linocuts,
originals sold one piece at a time, paid by bank transfer (QR Platba). Rebuilt as one monorepo on
the new Eleansphere core in 2026-09; the four earlier repositories are archived in
`projekty/_archiv/klotilda-legacy/`.

| Package | What it holds |
|---|---|
| `packages/domain` (`@klotilda/domain`) | Entity definitions, DTO types, constants and the typed API clients. Shared by all three apps; ships TypeScript source, no build step. No Node or DOM APIs (enforced by ESLint). |
| `apps/api` (`@klotilda/api`) | The REST API: `createCore` from `@eleansphere/be-core`, the checkout, e-mails, file authorization, migrations. |
| `apps/web` (`@klotilda/web`) | The public website and shop, Next.js 15 (App Router, next-intl cs/en). Keeps its own ESLint and Prettier setup. |
| `apps/admin` (`@klotilda/admin`) | The admin, Vue 3 + Vite + Nuxt UI: orders, products, the gallery. Czech only. |

The shared foundation lives in [`Eleansphere/core`](https://github.com/Eleansphere/core):
`@eleansphere/schema`, `@eleansphere/be-core` and `@eleansphere/entity-core`.

## The one rule that shapes everything

An entity is declared **once**, in `packages/domain/src/entities/<name>/` (`fields.ts` +
`index.ts` with `defineEntity`). From it come the table, the validated CRUD routes and their
access, the DTO types, the typed clients and the admin's form schema (`formSchema` in
`apps/admin/src/app/validation.ts`, the server's own rules with Czech messages). Changing the data
model means changing `fields.ts` — plus a migration (below).

Model names (`Product`, `Category`, `GalleryItem`, `Order`, `AdminUser`) are the production table names
(`Products`, …) — never rename them.

## Backend

`apps/api/src/app-config.ts` is the whole backend, declared; `src/env.ts` reads the environment.

- Categories: auto CRUD, anyone reads, the admin writes; the slug is stored normalized (`toSlug`).
  Products and gallery pictures point at one (`categoryId`, a foreign key: a category in use can't
  be deleted) and come back with it attached as `category` (`src/catalogue/categories.ts`). The
  shop shows only categories that hold something on offer.
- Products and the gallery: auto CRUD. Anyone reads the **active** rows; the signed-in admin reads
  all and writes (`activeUnlessSignedIn`). Each row carries `images` (`File` rows, `role: 'image'`,
  `refType` `Product` / `GalleryItem`); deleting a row deletes its photos.
- Orders: the admin lists, reads, PATCHes and deletes them; only `paymentStatus` and `orderStatus`
  are writable (everything else is `readOnly`). **An order is only ever created by
  `POST /api/checkout`** (`src/checkout/`), public and rate-limited: it takes the customer's
  details and `{ productId, quantity }` lines, charges the products' **own prices** and the
  shipping from `SHIPPING_PRICES`, and takes the stock down inside one transaction with the product
  rows locked (`FOR UPDATE`), so the last piece sells once. It answers the bank account, a random
  variable symbol and a QR Platba code, and e-mails the customer and `ADMIN_EMAIL` (a failed
  e-mail is only logged).
- Order actions: `POST /api/orders/:id/actions/:action` (`src/orders/`), signed-in admin only. The
  steps and when each is allowed are in the domain (`availableActions`, `applyAction` in
  `entities/order/workflow.ts`): mark-paid, ship (parcel number), ready-for-pickup, mark-delivered,
  cancel (puts the pieces back in stock unless `restock: false`), mark-refunded. Each is written to
  the order's `history` (JSON) and e-mails the customer unless `notify: false`; PATCHing the
  statuses stays for corrections and does neither. E-mails are blocks rendered as HTML in the
  site's colours and as plain text (`src/emails/email-layout.ts`); `SITE_URL` is linked in them.
- Files: any signed-in admin uploads (only product / gallery images) and deletes any photo; photos
  are public.
- Auth: be-core's login with rotating refresh tokens; accounts come from `seed:admin`
  (`SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`). There is no registration.
- E-mail: SMTP (the klotilda.cz mailbox); without `SMTP_HOST` e-mails are only logged. Production
  refuses to start without SMTP, R2 and `ADMIN_EMAIL`.
- Schema: `syncMode: 'migrate'`. `2026-09-27-baseline` is the DDL `sync()` generated, frozen,
  `IF NOT EXISTS` throughout — on production (built by the older be-core's `sync()`) it only adds
  the `Files` indexes and `RefreshTokens`. A model change needs a new migration:
  `migrations.integration.test.ts` compares a migrated schema with a `sync()`ed one and also
  upgrades a copy of the old production layout.

## Website

`apps/web/src/services/index.ts` wraps the domain clients: `listProducts`, `getProduct`,
`listGallery`, `checkout`. Photos go through `mediaUrl()` (relative `/api/files/:id` without a
bucket). `NEXT_PUBLIC_SHOP_ENABLED` gates the shop (see `src/lib/features.ts`).

## Admin

`src/app/api.ts` (session + services), `src/app/session.ts`, `src/pages/*`. Photos are scaled down
to WebP (2048 px) in the browser before upload (`resize-image.ts`). Every `UFormField` keeps a line
free for its message (`vite.config.ts`), so a message that appears or goes never moves a button
from under the pointer.

## Commands

```bash
docker compose up -d      # Postgres :5435, Mailpit :8026 (SMTP :1026)
pnpm dev                  # API :3001, web :3002, admin :5175
pnpm lint / typecheck / test / build
pnpm --filter @klotilda/api seed:admin               # create an admin / new password (asks for it)
pnpm --filter @klotilda/api seed:admin -- --list     # or --remove <e-mail>; only the admin table, no migrations
pnpm release patch|minor|major   # bump the version, commit, tag vX.Y.Z; then git push --follow-tags
```

One version for the whole project, in the root `package.json`. The web shows it in the footer
(`v0.1.0`; outside production with the commit, `v0.1.0 · 5d1bd33`). No public changelog.

## Deploy

Branches: `main` = production, `dev` = test.

- API: Railway project `Klotilda`, service `klotilda-api` + `Postgres`, two environments:
  - `production` — follows `main`, domain `klotilda-api-test.up.railway.app` (the name is left
    over from when this environment was called `test`), photos in the R2 bucket behind
    `pub-87a3….r2.dev`.
  - `test` — follows `dev`, domain `klotilda-api-test-b60e.up.railway.app`, its own database,
    photos in the R2 bucket `klotilda-media-test` served through the API (no public bucket URL),
    CORS only for the test sites. Admin accounts are seeded separately there.

  After a change to the catalogue, the gallery or the stock the API calls the web's
  `POST /api/revalidate` (`WEB_REVALIDATE_URL`, `WEB_REVALIDATE_SECRET` = the web's
  `REVALIDATE_SECRET`), so admin edits show at once; set for `test` / the `dev` branch, not yet
  for production. `SITE_URL` (linked from e-mails) is `https://test.klotilda.cz` on `test`.

  `apps/api/Dockerfile`, build context the repository root, `NODE_AUTH_TOKEN` as a build argument
  (the placeholder in `tooling/user.npmrc`; never name the token in a `RUN` line). Migrations run
  on start. In Railway a live source change applies to every environment — stage it per
  environment.
- Web: Vercel project `klotilda-frontend`, root `apps/web` — `klotilda.cz` / `www.klotilda.cz`
  from `main`, `test.klotilda.cz` from `dev`. Preview variables scoped to the `dev` branch point
  it at the test API and turn the shop on (`NEXT_PUBLIC_SHOP_ENABLED=true`); production keeps
  the shop off.
- Admin: Vercel project `klotilda-admin`, root `apps/admin` — `admin.klotilda.cz` from `main`,
  `admin.test.klotilda.cz` from `dev` (its `VITE_API_URL` for the `dev` branch is the test API).
  `VITE_API_URL` may end in `/api` (the old admin's setting); `src/app/api.ts` drops it.

## Conventions

- Finished, verified work may be committed and pushed to `dev` (the test sites) without asking;
  `main` (production) only when the user asks.
- `@eleansphere/*` installs from GitHub Packages; pnpm reads the token only from the user-level
  `~/.npmrc` (`//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}`).
