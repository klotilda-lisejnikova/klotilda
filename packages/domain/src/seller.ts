/**
 * The seller's details named while the `Seller` row the admin edits is missing (the API's e-mails
 * and the website's footer read the row). Every value is a PLACEHOLDER.
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
} as const;

/** The website's legal pages, the same path in both languages. */
export const LEGAL_PATHS = {
  terms: '/obchodni-podminky',
  privacy: '/ochrana-osobnich-udaju',
  withdrawal: '/odstoupeni-od-smlouvy',
} as const;
/** The complaints procedure is a section of the terms. */
export const COMPLAINTS_ANCHOR = 'reklamace';
