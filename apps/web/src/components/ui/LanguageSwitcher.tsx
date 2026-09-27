"use client";

import { useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

export default function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const nextLocale = locale === "cs" ? "en" : "cs";

  return (
    <Link
      href={pathname}
      locale={nextLocale}
      className="text-xs font-medium tracking-widest text-stone-500 transition-colors hover:text-stone-900"
    >
      {locale === "cs" ? "EN" : "CZ"}
    </Link>
  );
}
