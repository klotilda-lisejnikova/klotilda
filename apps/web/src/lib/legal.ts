import {
  COMPLAINTS_ANCHOR,
  LEGAL_PATHS,
  SELLER,
  TERMS_EFFECTIVE_FROM,
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

/**
 * The text with every `{{key}}` filled in, from `VALUES` and the page's own `extra` (what it loads,
 * such as the shipping prices); an unknown key is a mistake in the text.
 */
export function fillLegalText(
  text: string,
  extra: Record<string, string> = {},
): string {
  return text.replace(/\{\{(\w+)\}\}/g, (placeholder, key: string) => {
    const value = extra[key] ?? VALUES[key];
    if (value === undefined)
      throw new Error(`Unknown ${placeholder} in a legal text`);
    return value;
  });
}

export const SELLER_IS_PLACEHOLDER = SELLER.placeholder;

/** A shipping method as the terms list it. */
export interface ShippingPrice {
  name: string;
  price: number;
}

/** The terms' list of shipping prices, as Markdown; without methods, where to find them. */
export function shippingPriceList(
  methods: ShippingPrice[],
  locale: "cs" | "en",
): string {
  if (methods.length === 0) {
    return locale === "en"
      ? "The shipping options and their prices are shown at checkout."
      : "Způsoby dopravy a jejich ceny jsou uvedeny v pokladně.";
  }
  const free = locale === "en" ? "free" : "zdarma";
  const currency = locale === "en" ? "CZK" : "Kč";
  return methods
    .map(
      ({ name, price }) =>
        `- ${name}: ${price === 0 ? free : `${price.toLocaleString("cs-CZ")} ${currency}`}`,
    )
    .join("\n");
}
