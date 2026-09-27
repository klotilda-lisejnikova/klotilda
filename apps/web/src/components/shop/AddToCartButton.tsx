"use client";

import { useTranslations } from "next-intl";
import { useCartStore } from "@/store/cart.store";

interface Props {
  productId: string;
  name: string;
  price: number;
  inStock: boolean;
}

export default function AddToCartButton({ productId, name, price, inStock }: Props) {
  const t = useTranslations("shop");
  const { items, addItem } = useCartStore();
  const inCart = items.some((i) => i.productId === productId);
  const disabled = !inStock || inCart;

  return (
    <button
      onClick={() => addItem({ productId, name, price })}
      disabled={disabled}
      className={`flex w-full items-center justify-center gap-2.5 py-3.5 text-sm font-medium tracking-widest uppercase transition-colors ${
        !inStock
          ? "cursor-not-allowed bg-stone-100 text-stone-400"
          : inCart
            ? "cursor-default bg-stone-200 text-stone-500"
            : "bg-stone-800 text-white hover:bg-stone-700 active:bg-stone-900"
      }`}
    >
      {!inStock ? (
        <>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          {t("soldOutBtn")}
        </>
      ) : inCart ? (
        <>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
          </svg>
          {t("inCart")}
        </>
      ) : (
        <>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          {t("addToCart")}
        </>
      )}
    </button>
  );
}
