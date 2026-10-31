# Admin UI rework

**Ticket:** none yet
**Status:** active — steps 1–3 done, 4–9 open

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
4. **Command palette.** ⌘K / Ctrl+K: pages, orders by VS / surname / e-mail, products by name.
5. **Photos.** `UFileUpload` with drag and drop and previews; drag to reorder product photos (the first
   is the main one) and gallery items within a row; needs a check that the API can store the photo order
   (if not, a model change + migration, planned separately).
6. **Categories.** Drag to reorder instead of arrows (arrows kept for keyboard).
7. **Forms.** A sticky save bar on product and gallery forms, an unsaved-changes guard
   (`onBeforeRouteLeave` + `beforeunload`).
8. **Products.** A table/cards toggle, filters for hidden and sold-out, inline "in the shop" switch.
9. **Overview.** Tidy the stat tiles in the new theme; optionally a small paid-revenue chart by month.

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

## Not in scope

The website (`apps/web`), the API and the data model, except where step 5 turns out to need a photo
order field. No new pages.

## Decided

- 2026-10-31: Nuxt UI with the shadcn look, not shadcn-vue; start with steps 1–2, then continue in order.
- Phones keep the bottom bar (the owner may still ask for the drawer alone).

## Open questions for the owner

- Is there a mockup or a site whose admin look you like?
