import {
  COMPLAINTS_ANCHOR,
  LEGAL_PATHS,
  SELLER,
  SHIPPING_PRICES,
  TERMS_EFFECTIVE_FROM,
} from "@klotilda/domain";

/** What the legal texts may name as `{{key}}`: the seller, prices and the pages' paths. */
const VALUES: Record<string, string> = {
  sellerName: SELLER.name,
  sellerIco: SELLER.ico,
  sellerAddress: SELLER.address,
  sellerEmail: SELLER.email,
  sellerPhone: SELLER.phone,
  sellerRegistration: SELLER.registration,
  effectiveFrom: TERMS_EFFECTIVE_FROM,
  priceZasilkovna: String(SHIPPING_PRICES.zasilkovna),
  priceCeskaPosta: String(SHIPPING_PRICES.ceska_posta),
  termsPath: LEGAL_PATHS.terms,
  privacyPath: LEGAL_PATHS.privacy,
  withdrawalPath: LEGAL_PATHS.withdrawal,
  complaintsAnchor: COMPLAINTS_ANCHOR,
};

/** The text with every `{{key}}` filled in; an unknown key is a mistake in the text. */
export function fillLegalText(text: string): string {
  return text.replace(/\{\{(\w+)\}\}/g, (placeholder, key: string) => {
    const value = VALUES[key];
    if (value === undefined)
      throw new Error(`Unknown ${placeholder} in a legal text`);
    return value;
  });
}

export const SELLER_IS_PLACEHOLDER = SELLER.placeholder;
