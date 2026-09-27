import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SHOP_ENABLED } from "@/lib/features";

export default function Footer() {
  const t = useTranslations("footer");
  const tNav = useTranslations("nav");

  const links = [
    { href: "/#about", label: tNav("about") },
    { href: "/#gallery", label: tNav("gallery") },
    ...(SHOP_ENABLED ? [{ href: "/shop", label: tNav("shop") }] : []),
    { href: "/#contact", label: tNav("contact") },
  ];

  return (
    <footer className="border-t border-stone-200 bg-[#FAFAF8]">
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
                className="text-xs tracking-wide text-stone-500 transition-colors hover:text-moss"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Tagline + copyright */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-stone-100 pt-3 text-xs text-stone-400">
          <p>{t("tagline")}</p>
          <p>{t("copyright")}</p>
        </div>

      </div>
    </footer>
  );
}
