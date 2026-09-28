"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "@/i18n/navigation";
import CartLine from "@/components/shop/CartLine";
import { cartCount, cartTotal, isBlocked, useCart } from "@/store/cart.store";
import { useCartCheck } from "@/store/use-cart-check";

export default function CartDrawer() {
  const t = useTranslations("cart");
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const items = useCart();
  const count = cartCount(items);
  const blocked = items.some(isBlocked);
  // Prices and stock may have changed since the items went in: look again on every opening.
  const { checking } = useCartCheck(open);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const portal = (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/25 transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setOpen(false)}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("title")}
        aria-hidden={!open}
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-[#FAFAF8] shadow-xl transition-[translate,visibility] duration-300 ${
          open ? "visible translate-x-0" : "invisible translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
          <h2 className="font-serif text-lg font-light tracking-[0.12em] text-stone-800">
            {t("title")}
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t("close")}
            className="-m-2 p-2 text-stone-400 hover:text-stone-700"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <p className="text-sm text-stone-400">{t("empty")}</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm text-stone-600 underline hover:text-stone-900"
              >
                {t("continueShopping")}
              </button>
            </div>
          ) : (
            <ul className="flex flex-col gap-4">
              {items.map((item) => (
                <CartLine key={item.productId} item={item} />
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="flex flex-col gap-4 border-t border-stone-200 px-6 py-6">
            <div className="flex justify-between text-sm text-stone-700">
              <span>{t("total")}</span>
              <span className="tabular-nums">
                {cartTotal(items).toLocaleString("cs-CZ")}&nbsp;{t("currency")}
              </span>
            </div>
            {blocked && <p className="text-xs text-rose-600">{t("blocked")}</p>}
            {blocked || checking ? (
              <span className="block w-full bg-stone-300 py-3 text-center text-sm tracking-widest text-white uppercase">
                {checking ? t("checking") : t("checkout")}
              </span>
            ) : (
              <Link
                href="/checkout"
                onClick={() => setOpen(false)}
                className="bg-moss hover:bg-moss-deep block w-full py-3 text-center text-sm tracking-widest text-[#fafaf8] uppercase transition-colors"
              >
                {t("checkout")}
              </Link>
            )}
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("title")}
        className="hover:text-moss relative text-stone-600 transition-colors"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
          />
        </svg>
        {count > 0 && (
          <span className="bg-moss absolute -top-2 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] text-[#fafaf8] tabular-nums">
            {count}
          </span>
        )}
      </button>

      {mounted && createPortal(portal, document.body)}
    </>
  );
}
