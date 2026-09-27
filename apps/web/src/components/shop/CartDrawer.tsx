"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "@/i18n/navigation";
import { useCartStore } from "@/store/cart.store";

export default function CartDrawer() {
  const t = useTranslations("cart");
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { items, removeItem, totalItems, totalPrice } = useCartStore();
  const count = totalItems();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const portal = (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setOpen(false)}
      />

      <div
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-[#FAFAF8] shadow-xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
          <h2 className="text-sm tracking-widest uppercase text-stone-800">
            {t("title")}
          </h2>
          <button
            onClick={() => setOpen(false)}
            className="text-stone-400 hover:text-stone-700"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <p className="text-sm text-stone-400">{t("empty")}</p>
              <button
                onClick={() => setOpen(false)}
                className="text-sm underline text-stone-600 hover:text-stone-900"
              >
                {t("continueShopping")}
              </button>
            </div>
          ) : (
            <ul className="flex flex-col gap-4">
              {items.map((item) => (
                <li
                  key={item.productId}
                  className="flex items-start justify-between gap-4 border-b border-stone-100 pb-4"
                >
                  <div className="flex-1">
                    <p className="text-sm text-stone-800">{item.name}</p>
                    <p className="mt-0.5 text-sm text-stone-500">
                      {item.price.toLocaleString("cs-CZ")}&nbsp;{t("currency")}
                    </p>
                  </div>
                  <button
                    onClick={() => removeItem(item.productId)}
                    className="shrink-0 text-xs text-stone-400 underline hover:text-stone-700"
                  >
                    {t("remove")}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="flex flex-col gap-4 border-t border-stone-200 px-6 py-6">
            <div className="flex justify-between text-sm text-stone-700">
              <span>{t("total")}</span>
              <span>
                {totalPrice().toLocaleString("cs-CZ")}&nbsp;{t("currency")}
              </span>
            </div>
            <Link
              href="/checkout"
              onClick={() => setOpen(false)}
              className="block w-full bg-stone-800 py-3 text-center text-sm tracking-widest uppercase text-white transition-colors hover:bg-stone-700"
            >
              {t("checkout")}
            </Link>
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={t("title")}
        className="relative text-stone-600 transition-colors hover:text-moss"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
          />
        </svg>
        {mounted && count > 0 && (
          <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-stone-800 text-[10px] text-white">
            {count}
          </span>
        )}
      </button>

      {mounted && createPortal(portal, document.body)}
    </>
  );
}
