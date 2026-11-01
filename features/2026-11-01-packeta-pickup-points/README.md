# Zásilkovna pickup points at checkout

**Ticket:** none yet
**Status:** design

The owner (2026-11-01): "krok zásilkovna má chybu — musí si dotyčný vybrat místo k vyzvednutí v
blízkosti bydliště" and "projdi si i co musíme splnit u zásilkovny, musíme i přidat jejich banner
třeba do footeru". Today `zasilkovna` is a plain `delivery` method: the customer picks it in step 2
and the parcel has nowhere to go, because Zásilkovna delivers to a pickup point (výdejní místo or
Z-BOX) the customer chooses, not to the address from step 1. The order has to carry that point, and
the artist has to see it when she hands the parcel over.

Builds on the shipping methods from
[checkout and e-mail settings](../2026-11-01-checkout-and-email-settings/README.md); the legal
texts are being moved into the admin by [legal texts](../2026-11-01-legal-texts/README.md).

```mermaid
sequenceDiagram
  participant C as Customer (web step 2)
  participant W as Packeta widget
  participant A as API checkout
  participant P as Packeta validate endpoint
  C->>W: Packeta.Widget.pick(apiKey, callback, options)
  W-->>C: point (id, name, street, city, zip, group, …)
  C->>A: POST /api/checkout with pickupPointId
  A->>P: POST /v6/pps/api/widget/v1/validate {apiKey, point: {id}}
  P-->>A: isValid, point
  A-->>C: order (point snapshot from Packeta's answer)
```

The boundaries: the widget runs in the customer's browser, so its answer can be faked; the API
asks Packeta itself and stores what Packeta says, not what the browser sent.

## What Packeta asks of an e-shop

Read 2026-11-01 from Packeta's widget v6 manual (`old.docs.packeta.com/01-pickup-point-selection/02-widget-v6.html`),
"Jak začít" (`zasilkovna.cz/jak-zacit`) and the e-shop FAQ (`zasilkovna.cz/blog/caste-dotazy-e-shopu`):

- **An account** at `client.packeta.com` (free, approved within 3 working days), billing details and
  the sender filled in, the terms (VOP) accepted. Invoiced weekly. No minimum volume; a courier
  pickup only from ~12 parcels a day, otherwise the parcel is dropped off at a point.
- **The widget** needs the account's **API key** (16 characters, public, an account identifier; not
  the API password). External points and other countries are switched on in the client section.
- **Validate the chosen point on the server** (the selection happens on the customer's device and
  can be bypassed): `POST https://widget.packeta.com/v6/pps/api/widget/v1/validate`.
- **Unavailable points** (`error`: vacation, full, closing) must not be selectable; the widget does
  this itself, the validation catches the rest.
- **Each parcel** is entered in the client section (by hand, import or API) with the point id; the
  label is printed from "Podané zásilky", one per box, barcode uncovered. Parcel number format
  `Z 123 4567 890` (tracking as today).
- **Limits:** 5 kg, longest side 60 cm, sides together 120 cm (oversize up to 15 kg / 120 / 150 cm);
  insured up to 20 000 CZK. Larger ceramics need Česká pošta.
- **Logo / banner:** not required. Packeta recommends a homepage banner (`bannery_eshop_CZ.zip`), a
  pop-up, a subpage about Zásilkovna, and listing it on Heureka / Zboží. The owner wants it in the
  footer (below).

## The method says it needs a point

A new optional field on `ShippingMethod`: `pickupNetwork` (`ENUM ['packeta']`, empty = none). It is
separate from `kind`, which keeps deciding the workflow: a Zásilkovna parcel is still shipped and
tracked (`delivery`), only its destination is a point. "Zásilkovna na adresu" could then be added in
the admin as an ordinary delivery method, and another network (Balíkovna, PPL) would be one more
enum value and one more widget.

- Admin, Doprava dialog: a select "Výdejní místa" (Žádná / Zásilkovna).
- The migration sets `pickupNetwork = 'packeta'` on the seeded `zasilkovna` row.

## The order stores the point

New order columns, snapshots like `shippingName`, so the order never changes:

| field | what |
|---|---|
| `pickupPointId` | Packeta's point id; what the parcel is addressed to in Packeta |
| `pickupPointName` | e.g. "Praha 4, Budějovická 1667/64 (Albert)" |
| `pickupPointAddress` | street, zip and city of the point, one line |
| `pickupPointType` | `zbox` or empty (a staffed point) — the e-mail says how to collect |

The checkout request carries only `pickupPointId` (`customerFields`, optional there). The API:

- for a method with `pickupNetwork`: requires `pickupPointId` (digits) else **400**; asks Packeta's
  validate endpoint and stores the name and address **from Packeta's answer**; a point Packeta
  calls invalid is a **400** on `pickupPointId` ("choose another point").
- if Packeta can't be reached (timeout ~5 s, 5xx): **503**, "try again in a moment" — no order goes
  to a point nobody checked. The cart and the choice stay in the browser.
- for any other method: ignores `pickupPointId`, so a point left over from an abandoned choice
  never sticks.

The validation runs before the transaction that locks the stock, so a slow Packeta never holds the
locks. `PACKETA_API_KEY` in the API's environment (Railway `test` and `production`). It is checked at
checkout, not at start: a missing key answers 503 for a method with `pickupNetwork` alone, so the
rest of the shop works.

The home address (step 1) stays required: it is the invoice address, and asking for it keeps the
checkout the same for every method.

## Web: choosing the point

- Step 2: choosing a method with `pickupNetwork` shows **"Vybrat výdejní místo"** under it. After a
  choice, a small card with the point's name, address and a Z-BOX mark, and **"Změnit"**. "Další"
  stays disabled until a point is chosen. Switching to another method clears it.
- `https://widget.packeta.com/v6/www/js/library.js` loads only when the button is first pressed (no
  third-party script on other pages); a failure shows "Výběr výdejního místa se nepodařilo načíst,
  zkuste to znovu". Modal mode (tested on a phone).
- Options: `language` from the locale (`cs` / `en`), `country: 'cz'`, `vendors` Czech points + Z-BOX
  (`{ country: 'cz' }`, `{ country: 'cz', group: 'zbox' }`), `appIdentity: 'klotilda-<version>'`.
- The point is part of `CheckoutData`; step 4 and the thank-you page show "Výdejní místo: …". A 400
  on `pickupPointId` sends the customer back to step 2 with the message.
- `NEXT_PUBLIC_PACKETA_API_KEY` in Vercel (`klotilda-frontend`, both environments). Without it the
  method is shown as unavailable instead of breaking the checkout.
- `next.config.ts`: `Permissions-Policy` forbids geolocation everywhere (`geolocation=()`), which
  kills the widget's "near me"; allow it for the widget
  (`geolocation=(self "https://widget.packeta.com")`). The CSP has no `script-src` / `frame-src`.

## Zásilkovna in the footer

A small "Doručujeme se Zásilkovnou" with the official logo from Packeta's banner pack, in the
footer's legal row, linking to `zasilkovna.cz`. Shown only with the shop on (`SHOP_ENABLED`) — the
footer cannot know which methods are active without a request on every page, and Zásilkovna is
offered whenever the shop is. The logo is a static file in `apps/web/public/` (SVG if the pack has
one), `next/image`, muted to the footer's stone tones on hover only if the brand rules allow it —
the pack's rules decide; otherwise shown as delivered.

## Legal texts

- **Terms** (`obchodní podmínky`, Doprava): Zásilkovna delivers to the pickup point or Z-BOX the
  buyer chose; the buyer has 7 days to collect (Packeta's app can extend it); an uncollected parcel
  comes back and the buyer pays the shipping both ways. A new `TERMS_VERSION`.
- **Privacy**: the carrier receives name, e-mail, phone and the chosen point (no home address for
  Zásilkovna); choosing a point opens Packeta's map, which stores the last chosen point in its own
  cookies (`branchId`, `favorite-pickup-points`) and asks for location only if "near me" is used.
- The legal texts are moving into the admin (legal-texts step 3–4). If that has landed, these become
  a new published version in the admin; if not, the edit goes into `src/content/legal/*.ts` and the
  legal-texts migration seeds from it. Coordinated with that work, not done twice.

## E-mails

- Order received (customer) and new order (artist): a "Výdejní místo" row (name, address) instead of
  "Doručení na adresu" when the order has a point.
- Shipped: the same row, and for a Z-BOX one line that the code comes by SMS / in the app.
- A new placeholder `{{vydejni_misto}}` for the confirmation and shipped texts (empty without a
  point). The admin preview gets a sample point.

## Admin

- Order detail: a "Výdejní místo" block next to the address: name, address, Z-BOX mark, the id with
  a copy button (what she enters in Packeta's client section). The address-label text uses the point.
- Orders list: the point's town under "Zásilkovna" (small, secondary).

## Migration

`<date>-pickup-points`: `ShippingMethods.pickupNetwork`, set for `zasilkovna`; the four order
columns. Old Zásilkovna orders keep no point (nothing to backfill). `migrations.integration.test.ts`
as usual.

## Steps

1. API + domain: fields, migration, validation against Packeta (mocked in tests), e-mails, admin
   (Doprava select, order detail). PR into `dev`.
2. Web: widget in step 2, summary, error handling, `Permissions-Policy`, footer logo. PR into `dev`.
3. Legal texts, with the legal-texts work (above).

The legal-texts work also touches the checkout (terms version, step 4); these steps branch from the
latest `dev` and keep their checkout edits small.

## What the owner does

1. Register the shop at `client.packeta.com` (if not yet): billing details, the sender, VOP.
2. From the client section send: the **API key** (16 characters) — it goes into Railway
   (`PACKETA_API_KEY`) and Vercel (`NEXT_PUBLIC_PACKETA_API_KEY`), test first.
3. Download the banner pack (`bannery_eshop_CZ.zip`, linked from `zasilkovna.cz/jak-zacit`) and
   upload it, or let the logo be taken from it.
4. Decide: Z-BOX too (recommended yes), Slovakia (recommended no), and whether the price stays 99 Kč
   (edited in Doprava).
5. Per order afterwards: enter the parcel in the client section with the point id from the admin,
   print the label, drop it off at any point, then "Odeslat" in the admin with the `Z …` number.

## Not in this plan (follow-ups)

- Creating the parcel in Packeta from the admin (API password, `createPacket`, label PDF, number
  filled in automatically). Worth it once orders are regular.
- A `/zasilkovna` info page or a homepage banner (Packeta's other recommendations).
