/** What the shipping and payment methods share for the checkout to show. */
interface NamedMethod {
  name_cs: string;
  name_en?: string | null;
  description_cs?: string | null;
  description_en?: string | null;
}

/** A method's name and description in the page's language, Czech where English is missing. */
export function methodText(method: NamedMethod, locale: string) {
  const english = locale === "en";
  return {
    name: (english && method.name_en) || method.name_cs,
    description: (english && method.description_en) || method.description_cs,
  };
}
