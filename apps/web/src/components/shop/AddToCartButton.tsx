"use client";

import { useTranslations } from "next-intl";
import type { Product } from "@/services";
import { maxQuantity, useCart, useCartStore } from "@/store/cart.store";

type State = "soldOut" | "add" | "addAnother" | "full";

const ICON_PATHS: Record<State, string> = {
  soldOut:
    "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636",
  add: "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z",
  addAnother: "M12 5v14M5 12h14",
  full: "M5 13l4 4L19 7",
};

const STATE_CLASS: Record<State, string> = {
  soldOut: "cursor-not-allowed bg-stone-100 text-stone-400",
  add: "bg-moss text-[#fafaf8] hover:bg-moss-deep",
  addAnother: "bg-moss text-[#fafaf8] hover:bg-moss-deep",
  full: "cursor-default bg-stone-200 text-stone-500",
};

/** Adds one piece; once the product is in the cart, one more — up to what is in stock. */
export default function AddToCartButton({ product }: { product: Product }) {
  const t = useTranslations("shop");
  const addItem = useCartStore((state) => state.addItem);
  const inCart = useCart().find((item) => item.productId === product.id);

  const state: State =
    product.stockCount <= 0
      ? "soldOut"
      : !inCart
        ? "add"
        : inCart.quantity < maxQuantity(product)
          ? "addAnother"
          : "full";

  const label = {
    soldOut: t("soldOutBtn"),
    add: t("addToCart"),
    addAnother: t("addAnother", { count: inCart?.quantity ?? 0 }),
    full: t("inCart"),
  }[state];

  return (
    <button
      type="button"
      onClick={() => addItem(product)}
      disabled={state === "soldOut" || state === "full"}
      className={`flex w-full items-center justify-center gap-2.5 py-3.5 text-sm font-medium tracking-widest uppercase transition-colors ${STATE_CLASS[state]}`}
    >
      <svg
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d={ICON_PATHS[state]}
        />
      </svg>
      {label}
    </button>
  );
}
