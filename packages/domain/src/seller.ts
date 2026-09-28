/**
 * Who sells: shown in the website's footer (§ 435 of the Civil Code), in the terms and privacy
 * pages and in the order e-mails. Every value here is a PLACEHOLDER until the artist's details are
 * known — change them here, and set `placeholder` to false.
 */
export const SELLER = {
  /** The name the trade licence is issued to. */
  name: 'Jméno Příjmení',
  /** Identification number (IČO). */
  ico: '12345678',
  /** The registered place of business. */
  address: 'Ulice 1, 110 00 Praha 1',
  email: 'info@klotilda.cz',
  phone: '+420 000 000 000',
  registration: 'fyzická osoba podnikající podle živnostenského zákona',
  /** A VAT payer's prices and receipts would have to show VAT. */
  vatPayer: false,
  /** While true, the legal pages say the seller's details are still to be filled in. */
  placeholder: true,
} as const;

/**
 * The terms the customer agrees to at checkout. A change to the terms (the complaints section in
 * them included) gets a new version; every order stores the version it was placed under.
 */
export const TERMS_VERSION = '2026-09-28';
/** From when the terms apply, as the pages show it. */
export const TERMS_EFFECTIVE_FROM = '28. 9. 2026';

/** The website's legal pages, the same path in both languages. */
export const LEGAL_PATHS = {
  terms: '/obchodni-podminky',
  privacy: '/ochrana-osobnich-udaju',
  withdrawal: '/odstoupeni-od-smlouvy',
} as const;
/** The complaints procedure is a section of the terms. */
export const COMPLAINTS_ANCHOR = 'reklamace';

/** "Jméno Příjmení, IČO 12345678, Ulice 1, 110 00 Praha 1" */
export const SELLER_LINE = `${SELLER.name}, IČO ${SELLER.ico}, ${SELLER.address}`;
