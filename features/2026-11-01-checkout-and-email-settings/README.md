# Payment, shipping and e-mail settings in the admin

**Ticket:** none yet
**Status:** active — steps 1 and 2 (shipping, payment methods) on `dev`, step 3 (e-mails) in review

The owner wants the admin to define (1) which payment methods and which shipping options the shop
offers, and (2) the e-mails the API sends automatically. Today all three are code: `SHIPPING_PRICES`
/ `SHIPPING_METHODS` in `packages/domain/src/constants.ts`, bank transfer as the only payment, and
the texts in `apps/api/src/emails/order-emails.ts`.

## Shipping methods

A new entity `ShippingMethod` (table `ShippingMethods`): `code` (unique, normalized like a category
slug), `name_cs`, `name_en`, `description_cs/en`, `price` (CZK), `kind` (`delivery` | `pickup`),
`trackingUrl` (optional, `{number}` replaced by the parcel number), `active`, `sortOrder`.

- The checkout charges the method's stored `price` and refuses an inactive or unknown code (400).
- `Order.shippingMethod` becomes a plain string (it is stored as VARCHAR already), and the order
  snapshots `shippingName` and `shippingKind` so an old order never changes when a method is renamed
  or deleted. The workflow (`ship` vs `ready-for-pickup`) reads `shippingKind`, not the code.
- Migration: create the table, seed today's three methods with today's prices, add the two order
  columns and backfill them (`osobni_odber` → `pickup`, the rest → `delivery`).
- Web: step 2 of the checkout lists the active methods from the API instead of the constant. The
  terms no longer list shipping prices (they would change with every admin edit without a new
  `TERMS_VERSION`); they point to the checkout and the order's own price. `TERMS_VERSION`
  2026-11-01.
- Shipping an order stores its `trackingUrl` (from the method's template), so the link survives
  the method being edited; the migration backfills it for orders already shipped.

## Payment methods

A new entity `PaymentMethod` (table `PaymentMethods`): `code`, `name_cs/en`, `description_cs/en`,
`kind`, `fee` (CZK, added to the total), `active`, `sortOrder`. Which shipping it goes with follows
from its kind (`paymentFitsShipping`), not a column: cash only with a pickup, a transfer with
anything.

`kind` decides what the code does, so only these exist (decided 2026-11-01: bank transfer and cash at pickup; no dobírka):

- `bank_transfer` — today's flow: variable symbol, QR Platba, ships after payment.
- `cash` — paid in person when picking up (pickup only); no QR, `ready-for-pickup` before payment
  (and offered first), `mark-delivered` only once paid.

The order stores `paymentMethod`, `paymentName`, `paymentKind` and `paymentFee`; old orders are
backfilled as `bank_transfer` (`prevod`, the first of the two seeded methods; `hotove` is the
other). The checkout refuses a payment method that isn't offered or doesn't fit the shipping (400),
and answers the account and QR code only for a transfer. The admin's "Čeká na platbu" tab and the
overdue flag leave cash orders out; they wait in a tab of their own ("K přípravě, hotově"). The
e-mails say "pay at pickup" instead of the account, and a cash refund is "returned", not sent back
to an account. The terms name both ways of paying (`TERMS_VERSION` 2026-11-02).

## E-mails

A new entity `EmailTemplate`, one row per automatic e-mail (keys fixed in the domain, not added or
deleted in the admin): order received (customer), new order (artist), payment arrived, shipped,
ready for pickup, cancelled, refunded. Each row: `enabled`, `subject`, `heading`, `body` (plain text,
blank line = new paragraph) with placeholders (`{{vs}}`, `{{jmeno}}`, `{{castka}}`, `{{doprava}}`,
`{{cislo_zasilky}}`, …; each e-mail lists which it knows). The structured parts stay generated —
the item table, payment details, tracking button, address, legal links — so the admin can't break
them. Seeded from today's texts; "Obnovit výchozí text" restores the default; a live preview in the
admin renders the same HTML as the API. Sentences that depend on the payment kind (how to pay, how
money comes back) stay generated too, so one text fits every order. The order confirmation can't
be turned off. The admin refuses to save a placeholder the e-mail doesn't know or one written
incompletely; the API leaves one as written. One wording change: the confirmation's subject was
"čeká na platbu" for a transfer and "přijata" for cash; the one editable subject says "přijata"
for both (the payment details follow in the e-mail).

## Admin

A new sidebar group "Nastavení" with three pages. Doprava and Platby are lists like the categories
page (drag or arrows to reorder), a dialog form with `formSchema` validation, the "V nabídce"
switch inline. E-maily is a fixed list (no adding, deleting or reordering) with a "Posílat" switch,
each e-mail edited on its own page beside the live preview. The group is not on the phone's bottom bar (five slots), only in the
slide-over menu.

## Steps

1. Shipping methods: entity, migration, checkout, workflow by kind, admin page, web step 2. _(on `dev`)_
2. Payment methods: entity, migration, checkout + QR only for bank transfer, workflow, admin, web step 3. _(on `dev`)_
3. E-mail templates: entity, migration with the defaults, renderer with placeholders, admin with preview. _(in review)_

Each step is its own PR into `dev`, verified on the test sites.

## Follow-ups

- The admin overview's "K odeslání" tile and list count paid orders only; cash orders to prepare
  show in the orders page's own tab. Fold them into the overview once cash is actually used (the
  API's filters can't say "paid or cash" in one query). A cash order made ready but not yet paid
  sits in "Odesláno" with nothing counting it; the same fold-in should cover it.
- Deploying: `paymentMethod` is required at checkout, so a web older than the API (or a checkout
  page left open across the deploy) is refused until reloaded, and a newer web against an older
  API finds no payment methods. Harmless while production keeps the shop off; once it is on,
  deploy the API first and expect a short window.

## Decided

- 2026-11-01: payment by bank transfer and cash at pickup; no cash on delivery for now.
- 2026-11-01: e-mails: the admin edits the subject, heading and text of each; the parts made from
  the order are not switchable.
