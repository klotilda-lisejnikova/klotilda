# Zásilkovna pickup points at checkout

**Ticket:** none yet
**Status:** design

The owner (2026-11-01): "krok zásilkovna má chybu — musí si dotyčný vybrat místo k vyzvednutí v
blízkosti bydliště". Today `zasilkovna` is a plain `delivery` method: the customer picks it in step 2
and the parcel has nowhere to go, because Zásilkovna delivers to a pickup point (výdejní místo or
Z-BOX) the customer chooses, not to the address from step 1. The order has to carry that point, and
the artist has to see it when she hands the parcel over.

Builds on the shipping methods from
[checkout and e-mail settings](../2026-11-01-checkout-and-email-settings/README.md).

## The method says it needs a point

A new optional field on `ShippingMethod`: `pickupNetwork` (`ENUM ['packeta']`, empty = none). It is
separate from `kind`, which keeps deciding the workflow: a Zásilkovna parcel is still shipped and
tracked (`delivery`), only its destination is a point. So the admin could later add "Zásilkovna na
adresu" as an ordinary delivery method without a point, and another network (Balíkovna, PPL) would
be one more enum value and one more widget.

- Admin, Doprava dialog: a select "Výdejní místa" (Žádná / Zásilkovna).
- Migration sets `pickupNetwork = 'packeta'` on the seeded `zasilkovna` row.

## The order stores the point

New order columns, snapshot like `shippingName` so the order never changes:

| field | what |
|---|---|
| `pickupPointId` | Packeta's point id (digits); what the parcel is addressed to in Packeta |
| `pickupPointName` | e.g. "Praha 4, Budějovická 1667/64 (Albert)" |
| `pickupPointAddress` | street, zip and city of the point, one line |
| `pickupPointUrl` | the point's page on zasilkovna.cz (opening hours, map), when the widget gives it |

The customer sends id, name, address and url in the checkout request (`customerFields`, optional
there). The API then:

- for a method with `pickupNetwork`: requires `pickupPointId` (digits only) and `pickupPointName`,
  else **400** on `pickupPointId` — the order can't go without a point;
- for any other method: drops all four, so a point left over from an abandoned choice never sticks.

The name and address come from the client, as everything the customer types does. A wrong point
only hurts the customer who sent it, and the artist sees the id she ships to. Checking the id against
Packeta's point feed (needs the API key on the server and a cache of ~10 000 points) is a follow-up,
not this plan.

The home address (step 1) stays required: it is the invoice address, and asking for it keeps the
checkout the same for every method.

## Web: choosing the point

Packeta's official widget (v6): a script from `widget.packeta.com` and
`Packeta.Widget.pick(apiKey, callback, options)` opening a map with search in an overlay; the
callback gets the chosen point or `null` when closed. Exact fields and options to confirm against
the widget when implementing (the docs site couldn't be read from here).

- Step 2: choosing a method with `pickupNetwork` shows a button **"Vybrat výdejní místo"** under it.
  After a choice, a small card with the point's name and address and **"Změnit"**. "Další" stays
  disabled until a point is chosen.
- The script loads only when the button is first pressed (no third-party script on other pages);
  if it fails, a message "Výběr výdejního místa se nepodařilo načíst, zkuste to znovu".
- Options: language from the page locale (`cs` / `en`), country `cz` (Slovakia if the owner wants
  it), Z-BOXy included unless the owner says no.
- The point is part of `CheckoutData` (kept with the rest of the checkout state); switching to
  another method clears it.
- Step 4 (summary) and the thank-you page show "Výdejní místo: …".
- `NEXT_PUBLIC_PACKETA_API_KEY` in Vercel (both environments). The widget key is the public
  16-character "API klíč" from the Packeta client section, not the API password. Without it the
  method shows "Zásilkovna is temporarily unavailable" and can't be chosen, instead of breaking the
  checkout.
- `next.config.ts` headers: `Permissions-Policy` today forbids geolocation everywhere
  (`geolocation=()`), which would kill the widget's "near me" button; allow it for the widget's
  origin (`geolocation=(self "https://widget.packeta.com")`). The CSP has no `script-src` /
  `frame-src`, so nothing else blocks it.

## E-mails

- Order received (customer) and new order (artist): a "Výdejní místo" row (name, address, link)
  instead of "Doručení na adresu" when the order has a point.
- Shipped: the same row, so the customer knows where to go.
- A new placeholder `{{vydejni_misto}}` for the shipped and confirmation texts (empty without a
  point). Generated rows stay generated, as in the templates plan.
- The admin preview gets a sample point.

## Admin

- Order detail: a "Výdejní místo" block next to the address: name, address, the id with a copy
  button (what she types into Packeta's client section when creating the parcel), link to the
  point's page. The address-label text (`OrderDetailPage.vue`, line ~57) uses the point for such
  orders.
- Orders list: the shipping column shows the point's town under "Zásilkovna" (small, secondary).

## Migration

`2026-11-0X-pickup-points` (dated the day it is written): `ShippingMethods.pickupNetwork`, set for
`zasilkovna`; the four order columns. Old Zásilkovna orders keep no point (nothing to backfill).
`migrations.integration.test.ts` as usual.

## Not in this plan (follow-ups)

- Creating the parcel in Packeta from the admin (API password on the server, `createPacket` with
  the point id, label PDF, barcode as `trackingNumber`). Worth it once orders are regular.
- Verifying the point id on the server against Packeta's feed.
- Zásilkovna home delivery as a separate method (possible already through the admin once this
  ships; needs no code).

## Steps

One PR into `dev`: domain fields, migration, checkout validation and tests, web step 2 + summary,
e-mails, admin. The legal-texts work also touches the checkout (`termsVersion` check, step 4); this
change is small in those files and is rebased onto whatever of it has landed.

## Open questions for the owner

1. The Packeta widget API key (Klientská sekce Zásilkovny → API klíč). Without it the widget can be
   built and tested only up to the point of opening.
2. Z-BOXy too, or only staffed points? (Recommended: both.)
3. Czech Republic only, or Slovakia too? (Recommended: CZ only, prices are CZ.)
