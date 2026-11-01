# CLAUDE.md

Guidance for Claude Code when working in this repository — and the project's rulebook for humans
and agents alike. The working rules, git, plans and self-review gates below are adopted from the
author's open-procurement workspace (`open-procurement-claude`), adapted to a single GitHub monorepo
with no ticket tracker. `AGENTS.md` only points here, for coding tools other than Claude.

**Cross-cutting conventions** — comments state current intent, English for everything written down,
credentials are used and never displayed, ISO dates, docs ship with the change:

@conventions.md

Architectural patterns are in [design-patterns.md](design-patterns.md), the stack guides in
[style/](style/) (`typescript-backend.md`, `vue-projects.md`, `git-commits.md`). Where this file and
those documents disagree, this file wins.

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

Model names (`Product`, `Category`, `GalleryItem`, `Order`, `AdminUser`, `ShippingMethod`) are the
production table names (`Products`, …) — never rename them.

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
  price of the chosen **active** shipping method (400 otherwise), and takes the stock down
  inside one transaction with the product and shipping method rows locked (`FOR UPDATE`), so the
  last piece sells once. It answers the bank account, a random variable symbol and a QR Platba
  code, and e-mails the customer and `ADMIN_EMAIL` (a failed e-mail is only logged).
- Shipping methods (`ShippingMethod`, `/api/shipping-methods`): auto CRUD, rows the admin manages
  (code, names, description, price, `kind` `delivery` | `pickup`, an optional `trackingUrl` with
  `{number}`, `active`, `sortOrder`); visitors read only the active ones. The code is stored
  normalized (`toShippingCode`, `src/shipping/`). An order keeps the method's code and snapshots
  `shippingName`, `shippingKind` and `shippingPrice`, so editing or deleting a method changes no
  placed order's price or name; the workflow decides ship vs ready-for-pickup by `shippingKind`.
  The tracking link comes from the method as it is when the order is shipped (stored on the order
  as `trackingUrl`): an order not yet shipped follows an edit of the method's template, and gets
  no link once its method is deleted. The first three methods come from the `2026-11-01-shipping-methods`
  migration.
- Order actions: `POST /api/orders/:id/actions/:action` (`src/orders/`), signed-in admin only. The
  steps and when each is allowed are in the domain (`availableActions`, `applyAction` in
  `entities/order/workflow.ts`): mark-paid, ship (parcel number), ready-for-pickup, mark-delivered,
  cancel (puts the pieces back in stock unless `restock: false`), mark-refunded. Each is written to
  the order's `history` (JSON) and e-mails the customer unless `notify: false`; PATCHing the
  statuses stays for corrections and does neither. E-mails are blocks rendered as HTML in the
  site's colours and as plain text (`src/emails/email-layout.ts`); `SITE_URL` is linked in them.
- Files: any signed-in admin uploads (only product / gallery images) and deletes any photo; photos
  are public.
- Ordering (`src/catalogue/reorder-plugin.ts`, signed-in admin): `PUT /api/products/:id/images/order`
  (a product's photos, `File.sortOrder`; the first is the main one) and
  `PUT /api/gallery/rows/:row/order` (one gallery row), `PUT /api/categories/all/order` (every
  category) and `PUT /api/shipping-methods/all/order` (every shipping method). Each takes
  `{ ids }`, every row of the list once (else 409), and saves the order in one transaction.
- Auth: be-core's login with rotating refresh tokens; accounts come from `seed:admin`
  (`SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`). There is no registration.
- E-mail: Resend's HTTP API when `RESEND_API_KEY` is set — Railway blocks outbound SMTP below the
  Pro plan — else SMTP (Mailpit locally); with neither, e-mails are only logged. The klotilda.cz
  mailbox itself is at Zoner (`postmaster@`, alias `info@`). Production refuses to start without
  an e-mail transport, R2, `ADMIN_EMAIL`, `CORS_ORIGINS` and `TRUST_PROXY` (the proxies in front
  of the API, Railway: `1` — the rate limits count by the client's address), or with a
  `JWT_SECRET` shorter than 32 characters.
- Every answer carries `SECURITY_HEADERS` (`src/http/security-headers.ts`): nothing the API serves
  runs scripts or is framed.
  A query parameter that parses to an empty object (`stockCount[__proto__]=1`) is refused with a
  400 before any route (`src/http/query-guard.ts`).
- Schema: `syncMode: 'migrate'`. `2026-09-27-baseline` is the DDL `sync()` generated, frozen,
  `IF NOT EXISTS` throughout — on production (built by the older be-core's `sync()`) it only adds
  the `Files` indexes and `RefreshTokens`. A model change needs a new migration:
  `migrations.integration.test.ts` compares a migrated schema with a `sync()`ed one and also
  upgrades a copy of the old production layout.

## Website

`apps/web/src/services/index.ts` wraps the domain clients: `listProducts`, `getProduct`,
`listGallery`, `listShippingMethods`, `checkout`. The checkout reads the shipping methods live;
the terms name no shipping prices (the checkout shows them, the order states the one agreed).
Photos go through `mediaUrl()` (relative `/api/files/:id` without a bucket).
`NEXT_PUBLIC_SHOP_ENABLED` gates the shop (see `src/lib/features.ts`). The image
optimizer takes only the API's host and `NEXT_PUBLIC_MEDIA_URL` (the bucket's public URL, the API's
`R2_PUBLIC_BASE_URL`), which a Vercel production build requires. `next.config.ts` sets the
security headers of every page.

Legal pages — `/obchodni-podminky` (terms, complaints under `#reklamace`), `/ochrana-osobnich-udaju`,
`/odstoupeni-od-smlouvy` (the model withdrawal form, printable) — same path in both languages,
gated with the shop in `src/middleware.ts`; the footer links them and names the seller. The texts
are drafts in `src/content/legal/*.ts` (a small Markdown subset, `components/legal/LegalDocument`),
`{{…}}` filled from `packages/domain/src/seller.ts`: the seller's details (**placeholders** —
`SELLER.placeholder` shows a draft notice), `TERMS_VERSION`, `LEGAL_PATHS`. The checkout requires
the terms box (`termsAccepted: true`, else 400) and each order stores `termsVersion` +
`termsAcceptedAt`; changing what customers agree to means a new `TERMS_VERSION`.

## Admin

`src/app/api.ts` (session + services), `src/app/session.ts`, `src/pages/*`. Photos are scaled down
to WebP (2048 px) in the browser before upload (`resize-image.ts`); product photos, gallery
pictures within a row and categories are reordered by dragging or with arrow buttons
(`app/reorder.ts`). The product and gallery forms keep a save bar in view, send only the fields
that changed, and ask before unsaved changes are dropped (`app/unsaved-changes.ts`: leaving the
page, signing out, closing the tab). The products list is a table or cards (remembered per browser)
with an "in the shop" switch on every product. The overview counts through the API and charts the
paid revenue of the last 12 months by the month of the order (`app/revenue.ts`). Every `UFormField`
keeps a line free for its message (`vite.config.ts`), so a message that appears or goes never moves
a button from under the pointer. The sidebar's "Nastavení" group holds the shop's settings
(Doprava: the shipping methods); it is not on the phone's bottom bar, only in the slide-over.
`vercel.json` sends a Content-Security-Policy that allows only the admin's own scripts (hence
`public/color-scheme.js` instead of an inline script) and API calls only to `*.up.railway.app`.

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

  Both run with `NODE_ENV=production`, so each needs `TRUST_PROXY=1` and a `JWT_SECRET` of at
  least 32 characters before it takes a build that checks them, or the API won't start.

  After a change to the catalogue, the gallery or the stock the API calls the web's
  `POST /api/revalidate` (`WEB_REVALIDATE_URL`, `WEB_REVALIDATE_SECRET` = the web's
  `REVALIDATE_SECRET`), so admin edits show at once; set for `test` / the `dev` branch, not yet
  for production — set it there before the shop goes live: without it the shop's pages
  regenerate only hourly. `SITE_URL` (linked from e-mails) is `https://test.klotilda.cz` on `test`.

  `apps/api/Dockerfile`, build context the repository root, `NODE_AUTH_TOKEN` as a build argument
  (the placeholder in `tooling/user.npmrc`; never name the token in a `RUN` line). Migrations run
  on start. In Railway a live source change applies to every environment — stage it per
  environment.
- Web: Vercel project `klotilda-frontend`, root `apps/web` — `klotilda.cz` / `www.klotilda.cz`
  from `main`, `test.klotilda.cz` from `dev`. Preview variables scoped to the `dev` branch point
  it at the test API and turn the shop on (`NEXT_PUBLIC_SHOP_ENABLED=true`); production keeps
  the shop off. A production build needs `NEXT_PUBLIC_MEDIA_URL` (the production bucket's
  public URL) or it fails.
- Admin: Vercel project `klotilda-admin`, root `apps/admin` — `admin.klotilda.cz` from `main`,
  `admin.test.klotilda.cz` from `dev` (its `VITE_API_URL` for the `dev` branch is the test API).
  `VITE_API_URL` may end in `/api` (the old admin's setting); `src/app/api.ts` drops it.

## Working rules

- **Language:** code, comments, commit messages and agent-facing documentation (this file,
  `AGENTS.md`, READMEs, plans, reviews) are in **English**, whatever language the conversation is
  in. User-facing texts stay as they are: the admin is Czech only, the website Czech and English
  (next-intl), e-mails to customers Czech. Don't translate existing Czech strings. When in doubt,
  ask whether an end user reads the text in the running application.
- **Small steps:** prefer a change that can be reviewed, merged and deployed on its own over one
  that bundles unrelated concerns. No big-bang rewrites: pick one task of a plan, finish it, stop.
- **New code follows the rules from day one;** existing code is migrated opportunistically, when
  you touch it anyway, never as an unrelated clean-up pass.
- **Don't invent conventions** that are not written here, in `conventions.md`, `design-patterns.md`,
  `style/` or a plan. If a rule seems to be missing, raise it instead of guessing.
- **Before editing,** read the task, the surrounding code and `git status --short`. Preserve other
  people's uncommitted changes: don't revert them, don't reformat them, don't include them in your
  change or commit.
- **Make the smallest coherent change;** fix nearby debt only when you are already touching it and
  it does not grow into an unrelated refactor.
- **Never hand-edit generated files:** `pnpm-lock.yaml` (run `pnpm install`), and nothing derived
  from an entity by hand where `defineEntity` already derives it (see _The one rule_).
- **pnpm, not npm or yarn;** run `pnpm install` after changing a `package.json`.
- **Credentials:** `.env` files, `~/.npmrc`, the Railway and Vercel variables and the R2 keys hold
  live secrets. Never open a `.env` file whole or print a value; grep key names only. Refer to a
  secret by its name (`NODE_AUTH_TOKEN`, `RESEND_API_KEY`, `JWT_SECRET`, …), never by its value.
- **Production is the owner's:** never change the Railway `production` environment, the `main`
  branch, the production Vercel deployments or the production database without the owner's
  explicit word in the current conversation.

## Verifying a change

With the repository's own scripts, in this order:

1. Prettier on the changed files only (`pnpm exec prettier --write <files>`; `apps/web` formats with
   its own config, `pnpm --filter @klotilda/web exec prettier --write <files>`);
2. the relevant tests — `pnpm --filter <package> test`; the API's `*.integration.test.ts` need
   Postgres (`docker compose up -d`, `TEST_DATABASE_URL`);
3. `pnpm typecheck`;
4. `pnpm lint` — check-only first; `lint:fix` deliberately, not as a reflex.

A documentation-only change needs only its formatting checked. Then apply the _Self-review gates_.
Green tests are not verification: exercise the change end to end (`pnpm dev`, or the test sites
after a push to `dev`) and say so when that is blocked.

## Git and commits

Branches: `main` = production, `dev` = test (see _Deploy_). Work lands on `dev` first and reaches
`main` only by a merge the owner asks for.

- Finished, verified work may be committed and pushed to `dev` (the test sites) without asking;
  `main` (production) only when the owner asks. Larger work goes on a branch from `dev` and a pull
  request into `dev`. Never force-push, `reset --hard` or `clean -f`; never rewrite pushed history.
- Create a branch without tracking (`git switch --no-track -c <name> origin/dev`) and always push
  with the branch named (`git push -u origin <name>`), never a bare `git push`.
- **Message:** Conventional Commits, `type(scope): subject`, scopes `api`, `web`, `admin`, `domain`
  or none (`style/git-commits.md`). There is no ticket tracker, so no ticket ID. **No AI markers:**
  no `Co-Authored-By:`, `Claude-Session:` or similar trailer, in commits or pull requests.
- **Stage explicit paths** — never `git add -A`, `git add .` or `git commit -a`.
- Releases: `pnpm release patch|minor|major` on `main`, when the owner asks.
- `@eleansphere/*` installs from GitHub Packages; pnpm reads the token only from the user-level
  `~/.npmrc` (`//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}`).

## Plans

Forward-looking designs, refactor plans and reviews live in [features/](features/README.md), per
the **`feature-plans`** skill: one directory per feature, `features/<YYYY-MM-DD>-<slug>/README.md`,
headed by `**Ticket:**` (`none yet` — there is no tracker) and `**Status:**` — `design`, `planned`,
`active`, `deferred`, `shipped` or `archived`, free text after the word. A plan never moves; its
status changes in the file. Reviews sit beside their plan as `features/<slug>/review/<YYYY-MM-DD>-<subject>.md`,
unattached ones in a root `reviews/`. `./features.sh` lists the plans and checks their links
(`new`, `rename`, `check-links`, `due-survey`; it needs Python 3 and never commits).

- "Save this for later" means a new plan, `./features.sh new <slug> --status planned`, never memory.
- A plan's status flips to `shipped (YYYY-MM-DD)` in the commit that finishes the work.

## Self-review gates

Fresh context is the point: the reviewer starts from the artifacts, not from this conversation.
**Every gate is applied without being asked.**

| Gate           | When                                                 | Who                                                                                                              |
| -------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Design closure | before presenting a design as ready to approve       | `architecture-reviewer` over the written plan                                                                    |
| Pre-commit     | tests green, before `git commit`                     | `convention-reviewer` and an adversarial reviewer in parallel (skills `convention-review`, `adversarial-review`) |
| Epic survey    | a workstream's `**Status:**` reaches `shipped`       | `architecture-reviewer` over the epic, into `features/<epic>/review/<YYYY-MM-DD>-<subject>.md`                   |
| Epic closure   | the epic's own `README.md` Status flips to `shipped` | `architecture-reviewer` over the finished epic, same output                                                      |

- Read the skill, don't improvise the prompt, and run the `adversarial-review` attack list against
  the plan before writing the code. Tell the adversarial reviewer to run code, not just read it.
- The adversarial reviewer treats the repository as read-only (no git command that changes it;
  mutable copies go to the scratchpad) and follows the credentials rule of _Working rules_.
- Triage each finding as right, wrong or already solved, fix what is confirmed, re-run the tests,
  then commit.
- Prove every new guard red, for the reason you claim (`prove-red`).
- Skip the gates only for trivial mechanical changes: typos, doc-only touch-ups, version bumps.
- The epic gates apply only to an epic (a plan with workstream files); the survey is skipped while
  `./features.sh due-survey` shows fewer than ~20 commits since the epic's last survey.

## Skills and agents

- Skills in `.claude/skills/`: `convention-review`, `adversarial-review`, `prove-red` and
  `feature-plans`.
- Agents in `.claude/agents/`: `convention-reviewer` (a diff against the declared conventions) and
  `architecture-reviewer` (a design against the architecture and the code it makes claims about).
  Both are read-only and report through `ReportFindings`.
- `.claude/settings.json` holds the shared permissions: broad read-only and build commands are
  allowed, a push asks, force-push, `reset --hard`, `clean -f`, `rm -rf` and reading `.env` files
  are denied. The rules match commands as typed — a backstop, not a sandbox. Personal rules go in
  `.claude/settings.local.json` (gitignored).

## Keeping this file current

When a change alters something this file describes, update this file in the same commit rather
than letting it drift.
