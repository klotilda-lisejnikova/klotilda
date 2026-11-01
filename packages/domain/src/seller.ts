import { sellerLine } from './entities/seller';

/**
 * The seller's details the website shows (footer, legal pages) until it reads the `Seller` row the
 * admin edits; the API's e-mails already read the row. Every value is a PLACEHOLDER.
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
export const TERMS_VERSION = '2026-11-02';
/** From when the terms apply, as the pages show it. */
export const TERMS_EFFECTIVE_FROM = '2. 11. 2026';

/** The website's legal pages, the same path in both languages. */
export const LEGAL_PATHS = {
  terms: '/obchodni-podminky',
  privacy: '/ochrana-osobnich-udaju',
  withdrawal: '/odstoupeni-od-smlouvy',
} as const;
/** The complaints procedure is a section of the terms. */
export const COMPLAINTS_ANCHOR = 'reklamace';

/** "Jméno Příjmení, IČO 12345678, Ulice 1, 110 00 Praha 1" */
export const SELLER_LINE = sellerLine(SELLER);
