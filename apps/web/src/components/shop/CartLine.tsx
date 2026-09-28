"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { mediaUrl } from "@/lib/media-url";
import {
  isBlocked,
  itemName,
  maxQuantity,
  useCartStore,
  type CartItem,
} from "@/store/cart.store";

const ISSUE_TONE = {
  soldOut: "text-rose-600",
  unavailable: "text-rose-600",
  priceChanged: "text-amber-700",
  reduced: "text-amber-700",
} as const;

/** One cart line: photo, name, price, the − n + stepper (when more than one piece exists). */
export default function CartLine({ item }: { item: CartItem }) {
  const t = useTranslations("cart");
  const locale = useLocale();
  const setQuantity = useCartStore((state) => state.setQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const name = itemName(item, locale);
  const blocked = isBlocked(item);
  const max = maxQuantity(item);

  const stepClass =
    "flex h-7 w-7 items-center justify-center text-stone-500 transition-colors hover:text-stone-900 disabled:pointer-events-none disabled:opacity-30";

  return (
    <li className="flex gap-4 border-b border-stone-100 pb-4">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-sm bg-stone-100">
        {item.image && (
          <Image
            src={mediaUrl(item.image)}
            alt=""
            fill
            sizes="64px"
            className={`object-cover ${blocked ? "opacity-40 grayscale" : ""}`}
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p
            className={`text-sm ${blocked ? "text-stone-400 line-through" : "text-stone-800"}`}
          >
            {name}
          </p>
          <p className="shrink-0 text-sm text-stone-700 tabular-nums">
            {(item.price * item.quantity).toLocaleString("cs-CZ")}&nbsp;
            {t("currency")}
          </p>
        </div>

        {item.issue && (
          <p className={`mt-1 text-xs ${ISSUE_TONE[item.issue]}`}>
            {t(`issues.${item.issue}`, {
              previous: (item.previousPrice ?? item.price).toLocaleString(
                "cs-CZ",
              ),
              count: item.stockCount,
            })}
          </p>
        )}

        <div className="mt-2 flex items-center justify-between gap-3">
          {!blocked && max > 1 ? (
            <div
              className="flex items-center border border-stone-200"
              role="group"
              aria-label={t("quantity")}
            >
              <button
                type="button"
                onClick={() => setQuantity(item.productId, item.quantity - 1)}
                disabled={item.quantity <= 1}
                aria-label={t("decrease")}
                className={stepClass}
              >
                −
              </button>
              <span className="w-6 text-center text-sm text-stone-800 tabular-nums">
                {item.quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity(item.productId, item.quantity + 1)}
                disabled={item.quantity >= max}
                aria-label={t("increase")}
                className={stepClass}
              >
                +
              </button>
            </div>
          ) : (
            <span className="text-xs text-stone-400 tabular-nums">
              {item.quantity > 1 &&
                `${item.quantity} × ${item.price.toLocaleString("cs-CZ")} ${t("currency")}`}
            </span>
          )}
          <button
            type="button"
            onClick={() => removeItem(item.productId)}
            className="shrink-0 text-xs text-stone-400 underline hover:text-stone-700"
          >
            {t("remove")}
          </button>
        </div>
      </div>
    </li>
  );
}
