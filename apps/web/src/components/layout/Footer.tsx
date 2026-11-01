import { getTranslations } from "next-intl/server";
import {
  COMPLAINTS_ANCHOR,
  LEGAL_PATHS,
  SELLER,
  sellerLine,
} from "@klotilda/domain";
import { Link } from "@/i18n/navigation";
import { SHOP_ENABLED } from "@/lib/features";
import { loadStaticData } from "@/lib/static-data";
import { APP_VERSION } from "@/lib/version";
import { getSeller } from "@/services";

/** Who sells, as the footer names them: the admin's details, the domain's while there are none. */
async function loadSellerLine(): Promise<string> {
  const seller = await loadStaticData("Footer", getSeller, undefined);
  return sellerLine(seller ?? SELLER);
}

export default async function Footer() {
  const t = await getTranslations("footer");
  const tNav = await getTranslations("nav");
  const tLegal = await getTranslations("legal");
  const seller = SHOP_ENABLED ? await loadSellerLine() : null;

  const links = [
    { href: "/#about", label: tNav("about") },
    { href: "/#gallery", label: tNav("gallery") },
    ...(SHOP_ENABLED ? [{ href: "/shop", label: tNav("shop") }] : []),
    { href: "/#contact", label: tNav("contact") },
  ];
  const legalLinks = [
    { href: LEGAL_PATHS.terms, label: tLegal("terms.title") },
    {
      href: `${LEGAL_PATHS.terms}#${COMPLAINTS_ANCHOR}`,
      label: tLegal("complaints"),
    },
    { href: LEGAL_PATHS.privacy, label: tLegal("privacy.title") },
    { href: LEGAL_PATHS.withdrawal, label: tLegal("withdrawal.short") },
  ];

  return (
    <footer className="border-t border-stone-200 bg-[#FAFAF8] print:hidden">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-5 md:px-8">
        {/* Brand + nav */}
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <span className="font-serif text-sm tracking-[0.2em] text-stone-700">
            KLOTILDA
          </span>
          <nav className="flex flex-wrap gap-x-5 gap-y-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:text-moss text-xs tracking-wide text-stone-500 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* The shop's legal pages and who sells (§ 435 of the Civil Code). */}
        {seller !== null && (
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-stone-100 pt-3 text-xs text-stone-500">
            <nav
              className="flex flex-wrap gap-x-5 gap-y-1"
              aria-label={t("legal")}
            >
              {legalLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="hover:text-moss transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <p className="text-stone-400">
              {t("seller")}: {seller}
            </p>
          </div>
        )}

        {/* Tagline + copyright */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-stone-100 pt-3 text-xs text-stone-400">
          <p>{t("tagline")}</p>
          <p>
            {t("copyright")}
            <span className="ml-3 text-stone-300 tabular-nums">
              {APP_VERSION}
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}
