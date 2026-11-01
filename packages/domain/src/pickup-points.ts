/**
 * Zásilkovna (Packeta) pickup points: the shop sends to staffed points and Z-BOXes in the Czech
 * Republic. The web's map offers these and the API validates the chosen point against the same
 * list, so the two can't disagree.
 */
export const PACKETA_VENDORS = [{ country: 'cz' }, { country: 'cz', group: 'zbox' }] as const;
export const PACKETA_COUNTRY = 'cz';

/** Packeta's map (widget v6), loaded by the web only when the customer opens it. */
export const PACKETA_WIDGET_SCRIPT = 'https://widget.packeta.com/v6/www/js/library.js';
/** Where the API asks Packeta whether a point exists and can take the parcel now. */
export const PACKETA_VALIDATE_URL = 'https://widget.packeta.com/v6/pps/api/widget/v1/validate';

/** The longest pickup point id an order stores. */
export const PICKUP_POINT_ID_MAX_LENGTH = 20;
/** Packeta's point ids are numbers; anything else is refused before Packeta is asked. */
export const PICKUP_POINT_ID_PATTERN = new RegExp(`^\\d{1,${PICKUP_POINT_ID_MAX_LENGTH}}$`);

/** A pickup point's address as one line: `Českomoravská 2408, 190 00 Praha`. */
export function formatPickupPointAddress(address: {
  street?: string | null;
  zip?: string | null;
  city?: string | null;
}): string {
  const place = [address.zip, address.city]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ');
  return [address.street?.trim(), place].filter(Boolean).join(', ');
}
