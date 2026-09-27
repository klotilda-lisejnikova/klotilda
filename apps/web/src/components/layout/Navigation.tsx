"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import LanguageSwitcher from "@/components/ui/LanguageSwitcher";

interface NavLink {
  href: string;
  label: string;
}

export default function Navigation({ links }: { links: NavLink[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop */}
      <nav className="hidden items-center gap-6 md:flex">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-sm tracking-wide text-stone-600 transition-colors hover:text-moss"
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
          onClick={() => setOpen(!open)}
          aria-label="Menu"
          className="text-stone-700"
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

      {/* Mobile dropdown */}
      {open && (
        <div className="absolute inset-x-0 top-16 z-50 border-b border-stone-200 bg-[#FAFAF8] px-4 pb-4 md:hidden">
          <nav className="flex flex-col gap-4 pt-4">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="text-sm tracking-wide text-stone-600 transition-colors hover:text-moss"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
