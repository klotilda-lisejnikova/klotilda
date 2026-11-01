# Admin UI rework

**Ticket:** none yet
**Status:** shipped (2026-10-31)

The owner wants the admin's UI reworked and improved overall, and suggested shadcn. This plan reviews
the current admin (`dev` @ b6fc27f), weighs shadcn-vue against staying on Nuxt UI, and splits the work
into small steps, each one shippable on its own.

## Where the admin stands

About 2,700 lines: 9 pages, 3 components, Vue 3 + Vite + Nuxt UI 4 + TanStack Query. Its bones are
sound: Czech copy throughout, light/dark, a sidebar on desktop and a bottom bar on phones, skeletons and
error alerts on every list, toasts, a confirm dialog before deleting, the order workflow as action
buttons, and `formSchema` validation from the domain.

What holds it back:

1. **It looks generic.** Nuxt UI's default blue/violet/slate; nothing ties it to Klotilda. The website
   already has its own palette (`--color-moss` #567042, `--color-paper` #f5efe6 in
   `apps/web/src/app/globals.css`).
2. **A hand-built shell.** `AdminLayout.vue` builds the sidebar and bottom bar from buttons and links.
   Nuxt UI 4 ships `UDashboardGroup` / `UDashboardSidebar` / `UDashboardPanel` / `UDashboardNavbar`
   (collapsible, resizable, a mobile drawer) and `UNavigationMenu` for exactly this.
3. **Lists are hand-rolled `<ul>`s.** Orders have no columns to sort by, no row selection, no bulk
   action (e.g. mark several orders paid). `UTable` (TanStack Table underneath) covers this.
4. **Ordering by hand.** Categories move with up/down arrows, gallery photos by typing a number,
   product photos cannot be reordered at all (the first is the main one).
5. **Uploading** is a hidden `<input type=file>` behind a button: no drag and drop, no preview before
   upload, no progress. `UFileUpload` exists in Nuxt UI 4.
6. **Forms** have no unsaved-changes guard (leaving a half-edited product loses it silently) and the save
   button scrolls away on long forms.
7. **No quick jump.** Finding an order by its variable symbol means opening Orders and typing.
   `UCommandPalette` (⌘K / Ctrl+K) would search orders, products and pages from anywhere.
8. **Products** are cards only; no quick inline toggles (in the shop / hidden, stock).

## Library: shadcn-vue or Nuxt UI

shadcn is a React library; for Vue the equivalent is **shadcn-vue**. Both shadcn-vue and Nuxt UI 4 are
built on the same primitives, **Reka UI**, and both style with Tailwind 4. The difference is packaging:
shadcn-vue copies component sources into the repository for you to own; Nuxt UI is a dependency with a
theme config.

|                         | Nuxt UI 4 (stay)                                                                           | shadcn-vue (switch)                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Work                    | restyle and extend what is there                                                           | rewrite all 12 views and components                                                               |
| Ready-made admin pieces | dashboard shell, table, command palette, file upload, toasts, forms with schema validation | table, command, sidebar exist; forms via vee-validate, toasts via vue-sonner, file upload by hand |
| Look                    | themeable (colours, radius, fonts, per-component `ui` slots)                               | the shadcn look out of the box, every line editable                                               |
| Upkeep                  | upgrades through `pnpm update`                                                             | copied code is ours to maintain                                                                   |
| Risk                    | low; the `UFormField` spacing rule in `vite.config.ts` keeps working                       | regressions across every page, the field-spacing rule redone                                      |

**Recommendation: stay on Nuxt UI 4 and give it the shadcn look.** The shadcn feel is mostly neutral
greys, a single accent, thin borders, small radius and dense type, and that is a theme config away
(a neutral grey, a Klotilda moss accent, `--ui-radius`, slimmer cards). A switch would cost a full
rewrite for components we already have, and lose the dashboard, table, command palette and upload
components that make steps 2–7 cheap.

If the owner still prefers shadcn-vue, the steps below stay the same, but step 1 becomes "set up
shadcn-vue and port the shell" and every later step also ports the pages it touches.

## Steps

Each step is one commit (or a small PR) to `dev`, verified on `admin.test.klotilda.cz`.

1. **Theme.** _(done)_ Klotilda moss as `primary` on `stone` greys, Inter kept, slightly rounder
   corners, cards with a hairline shadow, a near-black dark mode (the overrides in `main.css`).
2. **Shell.** _(done)_ `AdminLayout.vue` on `UDashboardGroup` + a collapsible, resizable
   `UDashboardSidebar` (account menu and light/dark in its footer) + one `UDashboardPanel` with one
   `UDashboardNavbar`; `PageHeader.vue` teleports each page's back arrow, title and actions into it.
   Phones keep the bottom bar; the navbar's menu button opens the sidebar as a slide-over.
3. **Orders table.** _(done)_ From a tablet up, `UTable` with customer (items under the name), VS,
   date, shipping, one status column and total; the API sorts by date or total (the order entity's
   `sort` list); the stage tabs kept. Row selection with bulk actions on what every selected order
   allows: payment arrived, ship (without a tracking number), ready for pickup, handed over, with an
   optional shared message and the e-mail switch. Cancelling and refunding stay on the order's page.
   Phones keep the list.
4. **Command palette.** _(done)_ Ctrl+K / ⌘K, or a search button (the sidebar; the top bar below
   `lg`): orders and products found by the API, the sections, "new product" and "new gallery photo",
   and Nuxt UI's colour-mode switch.
5. **Photos.** _(done)_ A `UFileUpload` drop zone (or click to pick) with previews while uploading;
   product photos reordered by dragging or with arrows (the first is the main one), gallery pictures
   likewise within their row. `File.sortOrder` and `GalleryItem.sortOrder` already existed, so no
   migration: `PUT /api/products/:id/images/order` and `PUT /api/gallery/rows/:row/order` take every
   id of the list in the new order (409 when the list no longer matches) and save it in one
   transaction. Native HTML drag and drop, no new dependency; touch screens use the arrows. A
   replaced gallery photo is deleted only after the new one is uploaded.
6. **Categories.** _(done)_ Drag to reorder, the arrows kept for touch screens and the keyboard.
   `PUT /api/categories/all/order` saves the whole order in one transaction, like step 5's routes
   (it replaces one PATCH per moved category); the list shows the new order at once and goes back
   to the saved one if the save fails. A category is dragged by its grip, so its text stays
   selectable. All three reorder routes lock their rows in id order (parallel saves wait instead of
   deadlocking), and the arrows on all three pages keep the keyboard focus after a move.
7. **Forms.** _(done)_ A save bar that stays in view (`SaveBar.vue`, above the phone's bottom bar)
   with "unsaved changes" / "all saved"; Save is enabled once something changed. An unsaved-changes
   guard (`app/unsaved-changes.ts`): another page, another product or picture opened from the
   search palette, or signing out asks first (`LeaveDialog.vue`); closing or reloading the tab gets
   the browser's prompt. Changes are tracked per field: a reload of the row (a photo uploaded
   meanwhile) keeps the fields the admin edited and takes the rest from the server, so it neither
   wipes the edits (it used to overwrite the whole form) nor puts back a stock count a sale took
   down. An update sends only the changed fields; an edit typed while a save runs stays unsaved;
   an existing row's form shows a skeleton until it has loaded.
8. **Products.** _(done)_ Tabs All / For sale / Sold out / Hidden (`app/product-statuses.ts`, with
   counts within the chosen category). The tab and the category live in the address
   (`app/query-tabs.ts`, shared with the orders tabs); the browser's Back, the page's back arrow,
   Cancel and a delete return to the list as it was left (`app/list-return.ts`, orders too). The
   product entity now filters `stockCount` as a range (`stockCount=0`, `stockCount[gte]=1`), a query
   setting with no migration; the API refuses a query parameter that parses to an empty object
   (`http/query-guard.ts`). From a tablet up the admin picks a table or cards, remembered in the
   browser (`app/stored-choice.ts`); phones keep the cards. The table sorts by name, price or date
   (`app/table-sort.ts`, shared with the orders table) and every row and card has an "in the shop"
   switch: it moves at once, goes back with a message if the save fails, and the list reloads once
   no switch is still saving. A page emptied by a switch gives way to the last page left.
9. **Overview.** _(done)_ Stat tiles (`StatTile.vue`): awaiting payment (with how many of those
   are overdue, `isPaymentOverdue`, the same rule as the badges in both order lists), to send and on
   offer, counted by the API; paid this month, the chart's last column. The sold-out products still
   in the shop link to their tab. A chart of the paid revenue of the last
   12 months, by the month the order was placed (`RevenueChart.vue`, `app/revenue.ts`): plain HTML
   columns in the moss accent, a tooltip on hover and on keyboard focus, and a table view. The order
   entity filters `createdAt` as a range, a query setting with no migration; the paid orders are
   read page by page (`app/all-pages.ts`).

Steps 1–2 change the look of everything and are worth doing first; 3–9 are independent and can be
picked in any order or dropped.

## Follow-ups

From the review of steps 1–2 (2026-10-31), not fixed yet:

- Light-mode subtle badges (`error`, `success`, `warning` text on a 10% tint) measure 4.0–4.3:1, just
  under WCAG AA; this predates the rework. A step darker (`error-700`, `success-800`, `warning-800`)
  would pass, and darkens the solid buttons of those colours too.
- The sidebar's stored size is not clamped on load: a hand-edited `localStorage` value can make it
  absurdly wide. Change `storage-key` whenever its `unit`, `min-size` or `max-size` change.

From the review of step 3:

- After a bulk run the focus falls back to the page (the bar that opened the dialog is gone).
- With "send e-mail" off, the bulk dialog drops the typed message; the order's own page keeps it in
  the history. Pick one behaviour for both.

From the review of step 4:

- The order search matches the surname, e-mail and VS with no accent folding: "Jana Nováková" and
  "novakova" find nothing. Adding `customerFirstName` to the order's `search` and folding accents
  is an API change, planned separately. The palette shows five hits per group with no "show all".
- Ctrl+K works inside a form, so jumping away dropped unsaved edits; step 7's guard covers it now.

From the review of step 5:

- A second photo move made while the first move's refetch is still under way can flicker back to
  the first order until that refetch lands (the server keeps the right one).

From the review of step 6:

- Adding or deleting a category while a reorder is being saved makes the save fail with 409 (the
  move is lost, the list reloads). The window is one request long.
- Website revalidation matches paths case-sensitively, Express does not; the admin never sends an
  odd-cased path.

From the review of step 7:

- The category dialog (`CategoriesPage`) has no unsaved-changes guard: closing it drops the typed
  name. It is two fields, so it was left out.
- When the session expires the form is left without asking (the way to sign-in must stay open),
  and the edits are lost. A draft kept in `sessionStorage` and offered back after signing in again
  would cover it.

From the review of step 8:

- be-core's range filter passes an empty object (`stockCount[__proto__]=1`) on to the database and
  answers 500; klotilda refuses such a parameter itself (`http/query-guard.ts`). The fix belongs in
  `parseRange` in Eleansphere/core, with a 400 for an empty bound list.
- `Product.active` and `Product.stockCount` allow NULL (the baseline has defaults but no NOT NULL).
  A NULL row is in no counted tab, and a product form with the stock field emptied saves nothing
  for it. Marking both `required` with a migration that fills the NULLs fixes both; whether
  production holds any is unchecked.
- Sorting by name follows the database's collation: under `C` (the local database) "Čajník" comes
  after "Zvonek". Production's collation is unchecked; a Czech ICU collation on `name_cs` would fix
  it.

From step 9 and its review:

- Revenue counts an order in the month it was placed, not the month it was paid: one placed on the
  30th and paid on the 2nd counts in the earlier month. The `mark-paid` event in the order's
  history holds the payment date (an order marked paid by a PATCH correction has none).
- The chart's months are fixed when the page opens; a page left open into a new month shows the old
  window until it is reloaded.
- The bars use moss-500, which the dataviz palette check flags as below its chroma floor (the brand
  moss is muted). Harmless for one series; a second series needs a checked palette.
- A paid order that was cancelled counts as revenue until it is marked refunded.
- On a phone a tap focuses a column without opening its tooltip; the table view shows the values.
- be-core checks a `DATE` filter value with `Date.parse` but Sequelize formats it with moment:
  `createdAt[gte]=2026-02-30` reaches Postgres as `'Invalid date'` and answers 500 (a signed-in
  admin's hand-made address only; the admin sends `toISOString()`). The fix belongs in
  `coerceValue` in Eleansphere/core, beside the empty range of step 8.
- An order action whose e-mail failed refreshes only that order (`OrderDetailPage`), not the lists,
  so the overview can show the old state until its next refetch.

## Not in scope

The website (`apps/web`), the API and the data model, except the reorder routes of steps 5 and 6
and the query settings of steps 8 and 9 (with `http/query-guard.ts`). No new pages.

## Decided

- 2026-10-31: Nuxt UI with the shadcn look, not shadcn-vue; start with steps 1–2, then continue in order.
- Phones keep the bottom bar (the owner may still ask for the drawer alone).

## Open questions for the owner

- Is there a mockup or a site whose admin look you like?
