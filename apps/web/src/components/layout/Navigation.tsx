"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import LanguageSwitcher from "@/components/ui/LanguageSwitcher";

interface NavLink {
  href: string;
  label: string;
}

const MOBILE_MENU_ID = "mobile-menu";

export default function Navigation({ links }: { links: NavLink[] }) {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);

  // While the phone menu is open: Esc closes it, the page underneath does not scroll, and it
  // closes by itself once the window grows to the desktop layout.
  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const desktop = window.matchMedia("(min-width: 768px)");
    const onDesktop = () => desktop.matches && setOpen(false);

    window.addEventListener("keydown", onKey);
    desktop.addEventListener("change", onDesktop);
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      desktop.removeEventListener("change", onDesktop);
      root.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      {/* Desktop */}
      <nav className="hidden items-center gap-6 md:flex">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="hover:text-moss text-sm tracking-wide text-stone-600 transition-colors"
          >
            {link.label}
          </Link>
        ))}
        <LanguageSwitcher />
      </nav>

      {/* Mobile */}
      <div className="flex items-center gap-3 md:hidden">
        <LanguageSwitcher />
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-label={t("menu")}
          aria-expanded={open}
          aria-controls={MOBILE_MENU_ID}
          className="-m-2 p-2 text-stone-700"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {open ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile dropdown; a tap on the dimmed page below closes it. */}
      <div
        aria-hidden="true"
        onClick={() => setOpen(false)}
        className={`fixed inset-x-0 top-16 bottom-0 z-40 bg-stone-900/25 transition-opacity duration-200 md:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <div
        id={MOBILE_MENU_ID}
        className={`absolute inset-x-0 top-16 z-50 border-b border-stone-200 bg-[#FAFAF8] px-4 pb-4 shadow-sm transition-[opacity,translate,visibility] duration-200 md:hidden ${
          open
            ? "visible translate-y-0 opacity-100"
            : "invisible -translate-y-2 opacity-0"
        }`}
      >
        <nav className="flex flex-col pt-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="hover:text-moss py-3 text-sm tracking-wide text-stone-600 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
