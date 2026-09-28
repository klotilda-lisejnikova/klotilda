import { getTranslations } from "next-intl/server";
import { TERMS_EFFECTIVE_FROM } from "@klotilda/domain";
import { PRIVACY } from "@/content/legal/privacy";
import { TERMS } from "@/content/legal/terms";
import { WITHDRAWAL } from "@/content/legal/withdrawal";
import { fillLegalText, SELLER_IS_PLACEHOLDER } from "@/lib/legal";
import LegalDocument from "./LegalDocument";
import PrintButton from "./PrintButton";

const DOCUMENTS = { terms: TERMS, privacy: PRIVACY, withdrawal: WITHDRAWAL };
export type LegalKind = keyof typeof DOCUMENTS;

/** The page title, for the metadata. */
export async function legalTitle(kind: LegalKind, locale: string) {
  const t = await getTranslations({ locale, namespace: "legal" });
  return t(`${kind}.title`);
}

/** A legal text on the paper background, in the home page's type. */
export default async function LegalPage({
  kind,
  locale,
}: {
  kind: LegalKind;
  locale: string;
}) {
  const t = await getTranslations({ locale, namespace: "legal" });
  const source = fillLegalText(DOCUMENTS[kind][locale === "en" ? "en" : "cs"]);

  return (
    <section className="bg-paper print:bg-white">
      <div className="mx-auto max-w-3xl px-4 pt-16 pb-24 md:px-8 md:pt-24 md:pb-32">
        <h1 className="font-serif text-3xl font-light tracking-[0.12em] text-stone-800 md:text-4xl">
          {t(`${kind}.title`)}
        </h1>
        <p className="mt-3 text-xs tracking-widest text-stone-500">
          {t("effectiveFrom", { date: TERMS_EFFECTIVE_FROM })}
        </p>

        {SELLER_IS_PLACEHOLDER && (
          <p
            className="mt-8 border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 print:hidden"
            role="note"
          >
            {t("draft")}
          </p>
        )}

        {kind === "withdrawal" && (
          <div className="mt-8 print:hidden">
            <PrintButton label={t("print")} />
          </div>
        )}

        <div className="mt-10">
          <LegalDocument source={source} />
        </div>
      </div>
    </section>
  );
}
