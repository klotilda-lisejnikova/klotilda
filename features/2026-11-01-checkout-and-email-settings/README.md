# Payment, shipping and e-mail settings in the admin

**Ticket:** none yet
**Status:** active — step 1 (shipping methods) in progress

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
- Web: step 2 of the checkout lists the active methods from the API instead of the constant; the
  terms page's prices come from the same data.

## Payment methods

A new entity `PaymentMethod`: `code`, `name_cs/en`, `description_cs/en`, `kind`, `fee` (CZK, added
to the total), `active`, `sortOrder`, and which shipping kinds it may combine with.

`kind` decides what the code does, so only these exist (decided 2026-11-01: bank transfer and cash at pickup; no dobírka):

- `bank_transfer` — today's flow: variable symbol, QR Platba, ships after payment.
- `cash` — paid in person when picking up (pickup only); no QR, `ready-for-pickup` before payment.

The order stores `paymentMethod`, `paymentName`, `paymentKind` and `paymentFee`; old orders are
backfilled as `bank_transfer`. The checkout refuses a payment method that doesn't fit the shipping.

## E-mails

A new entity `EmailTemplate`, one row per automatic e-mail (keys fixed in the domain, not added or
deleted in the admin): order received (customer), new order (artist), payment arrived, shipped,
ready for pickup, cancelled, refunded. Each row: `enabled`, `subject`, `heading`, `body` (plain text,
blank line = new paragraph) with placeholders (`{{vs}}`, `{{jmeno}}`, `{{castka}}`, `{{doprava}}`,
`{{cislo_zasilky}}`, …; each e-mail lists which it knows). The structured parts stay generated —
the item table, payment details, tracking button, address, legal links — so the admin can't break
them. Seeded from today's texts; "Obnovit výchozí text" restores the default; a live preview in the
admin renders the same HTML as the API (decision 2 is how much is editable).

## Admin

A new sidebar group "Nastavení" with three pages: Doprava, Platby, E-maily — lists in the reworked
style (`UTable` from a tablet up, cards on phones, drag to reorder like categories), a slide-over
form with `formSchema` validation, the active switch inline.

## Steps

1. Shipping methods: entity, migration, checkout, workflow by kind, admin page, web step 2.
2. Payment methods: entity, migration, checkout + QR only for bank transfer, workflow, admin, web step 3.
3. E-mail templates: entity, migration with the defaults, renderer with placeholders, admin with preview.

Each step is its own PR into `dev`, verified on the test sites.

## Decided

- 2026-11-01: payment by bank transfer and cash at pickup; no cash on delivery for now.

## Open questions for the owner

1. E-mails: edit subject, heading and text (recommended), or also switch individual parts (item
   table, legal links) on and off?
