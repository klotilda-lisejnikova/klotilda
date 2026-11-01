import { getTranslations } from "next-intl/server";
import {
  formatCzechDate,
  LEGAL_PATHS,
  legalVersionPath,
} from "@klotilda/domain";
import type { LegalDocumentKey } from "@klotilda/domain";
import { Link } from "@/i18n/navigation";
import { legalSource, loadLegalPage, versionDate } from "@/lib/legal";
import LegalDocument from "./LegalDocument";
import PrintButton from "./PrintButton";

export type LegalKind = LegalDocumentKey;

/** The page title, for the metadata. */
export async function legalTitle(kind: LegalKind, locale: string) {
  const t = await getTranslations({ locale, namespace: "legal" });
  return t(`${kind}.title`);
}

/**
 * A legal text on the paper background, in the home page's type: the version in force, or the
 * earlier one `version` names, exactly as it was published. The other versions are linked below.
 */
export default async function LegalPage({
  kind,
  locale,
  version,
}: {
  kind: LegalKind;
  locale: string;
  version?: string;
}) {
  const t = await getTranslations({ locale, namespace: "legal" });
  const data = await loadLegalPage(kind, version);
  if (!data) return null;

  const [current, ...earlier] = data.versions;
  const shown = data.version;
  const archived = current !== undefined && shown.version !== current.version;
  const { text, czechOnly } = legalSource(shown, locale);
  const listed = earlier.filter((entry) => entry.version !== shown.version);

  return (
    <section className="bg-paper print:bg-white">
      <div className="mx-auto max-w-3xl px-4 pt-16 pb-24 md:px-8 md:pt-24 md:pb-32">
        <h1 className="font-serif text-3xl font-light tracking-[0.12em] text-stone-800 md:text-4xl">
          {t(`${kind}.title`)}
        </h1>
        <p className="mt-3 text-xs tracking-widest text-stone-500">
          {t("effectiveFrom", { date: formatCzechDate(shown.effectiveFrom) })}
        </p>

        {archived && (
          <p
            className="mt-8 border border-stone-300 bg-white px-4 py-3 text-sm text-stone-700"
            role="note"
          >
            {t("archived", { date: formatCzechDate(shown.effectiveFrom) })}{" "}
            <Link
              href={LEGAL_PATHS[kind]}
              className="text-moss underline underline-offset-2"
            >
              {t("current")}
            </Link>
          </p>
        )}

        {data.draft && (
          <p
            className="mt-8 border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 print:hidden"
            role="note"
          >
            {t("draft")}
          </p>
        )}

        {czechOnly && (
          <p className="mt-8 text-sm text-stone-500" role="note">
            {t("czechOnly")}
          </p>
        )}

        {kind === "withdrawal" && (
          <div className="mt-8 print:hidden">
            <PrintButton label={t("print")} />
          </div>
        )}

        <div className="mt-10" lang={czechOnly ? "cs" : undefined}>
          <LegalDocument source={text} />
        </div>

        {listed.length > 0 && (
          <nav
            className="mt-16 border-t border-stone-200 pt-6 text-sm text-stone-500 print:hidden"
            aria-label={t("versions")}
          >
            <h2 className="mb-2 text-xs tracking-widest uppercase">
              {t("versions")}
            </h2>
            <ul className="flex flex-col gap-1">
              {listed.map((entry) => (
                <li key={entry.version}>
                  <Link
                    href={legalVersionPath(kind, entry.version)}
                    className="hover:text-moss underline underline-offset-2"
                  >
                    {t("effectiveFrom", { date: versionDate(entry) })}
                    {entry.version !== entry.effectiveFrom &&
                      ` (${entry.version})`}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </section>
  );
}
