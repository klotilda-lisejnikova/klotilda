import {
  COMPLAINTS_ANCHOR,
  fillPlaceholders,
  LEGAL_PATHS,
  SELLER,
  TERMS_EFFECTIVE_FROM,
  unknownPlaceholders,
} from "@klotilda/domain";

/** What the legal texts may name as `{{key}}`: the seller, the dates and the pages' paths. */
const VALUES: Record<string, string> = {
  sellerName: SELLER.name,
  sellerIco: SELLER.ico,
  sellerAddress: SELLER.address,
  sellerEmail: SELLER.email,
  sellerPhone: SELLER.phone,
  sellerRegistration: SELLER.registration,
  effectiveFrom: TERMS_EFFECTIVE_FROM,
  termsPath: LEGAL_PATHS.terms,
  privacyPath: LEGAL_PATHS.privacy,
  withdrawalPath: LEGAL_PATHS.withdrawal,
  complaintsAnchor: COMPLAINTS_ANCHOR,
};

/** The text with every `{{key}}` filled in; an unknown key is a mistake in the text. */
export function fillLegalText(text: string): string {
  const [unknown] = unknownPlaceholders(text, Object.keys(VALUES));
  if (unknown !== undefined)
    throw new Error(`Unknown {{${unknown}}} in a legal text`);
  return fillPlaceholders(text, VALUES);
}

export const SELLER_IS_PLACEHOLDER = SELLER.placeholder;
