import { useTranslations } from "next-intl";
import CartLine from "@/components/shop/CartLine";
import { cartTotal, isBlocked, type CartItem } from "@/store/cart.store";
import { CheckoutData } from "./types";

/** `cartChanged`: the shop refused the lines as they were; `failed`: anything else. */
export type SubmitError = "cartChanged" | "failed";

interface Props {
  data: CheckoutData;
  onChange: (data: Partial<CheckoutData>) => void;
  items: CartItem[];
  onSubmit: () => void;
  onBack: () => void;
  loading: boolean;
  error: SubmitError | null;
}

export default function Step4Summary({
  data,
  onChange,
  items,
  onSubmit,
  onBack,
  loading,
  error,
}: Props) {
  const t = useTranslations("checkout");
  const tCart = useTranslations("cart");
  const total = cartTotal(items) + data.shippingPrice;
  const blocked = items.some(isBlocked);

  return (
    <div className="flex flex-col gap-6">
      {/* Items */}
      <div>
        <p className="mb-3 text-xs tracking-widest text-stone-400 uppercase">
          {t("summary.items")}
        </p>
        <ul className="flex flex-col gap-4">
          {items.map((item) => (
            <CartLine key={item.productId} item={item} />
          ))}
        </ul>
      </div>

      {/* Shipping + total */}
      <div className="flex flex-col gap-2 border-t border-stone-100 pt-4">
        <div className="flex justify-between text-sm text-stone-500">
          <span>
            {t("summary.shipping")} — {t(`shipping.${data.shippingMethod}`)}
          </span>
          <span>
            {data.shippingPrice === 0
              ? t("shipping.free")
              : `${data.shippingPrice} ${t("currency")}`}
          </span>
        </div>
        <div className="flex justify-between text-base font-medium text-stone-800">
          <span>{t("summary.total")}</span>
          <span className="tabular-nums">
            {total.toLocaleString("cs-CZ")} {t("currency")}
          </span>
        </div>
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="checkout-notes"
          className="text-xs tracking-wide text-stone-500"
        >
          {t("summary.notes")}
        </label>
        <textarea
          id="checkout-notes"
          value={data.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          rows={3}
          className="resize-none border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-stone-500"
        />
      </div>

      {blocked ? (
        <p className="text-sm text-rose-600" role="alert">
          {tCart("blocked")}
        </p>
      ) : (
        error && (
          <p className="text-sm text-rose-600" role="alert">
            {error === "cartChanged" ? t("errorChanged") : t("error")}
          </p>
        )
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="flex-1 border border-stone-300 py-3 text-sm tracking-widest text-stone-600 uppercase transition-colors hover:border-stone-500 disabled:opacity-40"
        >
          {t("back")}
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={loading || blocked}
          className="flex-1 bg-stone-800 py-3 text-sm tracking-widest text-white uppercase transition-colors hover:bg-stone-700 disabled:opacity-40"
        >
          {loading ? t("loading") : t("summary.confirm")}
        </button>
      </div>
    </div>
  );
}
