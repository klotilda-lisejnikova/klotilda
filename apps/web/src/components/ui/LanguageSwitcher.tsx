"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

/** The page's query, read once it is in the browser (a static page is rendered without one). */
function useCurrentQuery(pathname: string): Record<string, string> {
  const [query, setQuery] = useState<Record<string, string>>({});
  useEffect(() => {
    setQuery(Object.fromEntries(new URLSearchParams(window.location.search)));
  }, [pathname]);
  return query;
}

/** The same page in the other language, its query kept (the review form's link, say). */
export default function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const query = useCurrentQuery(pathname);
  const nextLocale = locale === "cs" ? "en" : "cs";

  return (
    <Link
      href={{ pathname, query }}
      locale={nextLocale}
      className="text-xs font-medium tracking-widest text-stone-500 transition-colors hover:text-stone-900"
    >
      {locale === "cs" ? "EN" : "CZ"}
    </Link>
  );
}
