import { useTranslations } from "next-intl";
import { CartItem } from "@/store/cart.store";
import { CheckoutData } from "./types";

interface Props {
  data: CheckoutData;
  onChange: (data: Partial<CheckoutData>) => void;
  items: CartItem[];
  onSubmit: () => void;
  onBack: () => void;
  loading: boolean;
  error: string | null;
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
  const itemsTotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const total = itemsTotal + data.shippingPrice;

  return (
    <div className="flex flex-col gap-6">
      {/* Items */}
      <div>
        <p className="mb-2 text-xs tracking-widest uppercase text-stone-400">{t("summary.items")}</p>
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.productId} className="flex justify-between text-sm text-stone-700">
              <span>{item.name}</span>
              <span>{item.price.toLocaleString("cs-CZ")} {t("currency")}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Shipping + total */}
      <div className="border-t border-stone-100 pt-4 flex flex-col gap-2">
        <div className="flex justify-between text-sm text-stone-500">
          <span>{t("summary.shipping")} — {t(`shipping.${data.shippingMethod}`)}</span>
          <span>
            {data.shippingPrice === 0
              ? t("shipping.free")
              : `${data.shippingPrice} ${t("currency")}`}
          </span>
        </div>
        <div className="flex justify-between text-base font-medium text-stone-800">
          <span>{t("summary.total")}</span>
          <span>{total.toLocaleString("cs-CZ")} {t("currency")}</span>
        </div>
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-1">
        <label className="text-xs tracking-wide text-stone-500">{t("summary.notes")}</label>
        <textarea
          value={data.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          rows={3}
          className="border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-stone-500 resize-none"
        />
      </div>

      {error && <p className="text-sm text-red-500">{t("error")}</p>}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={loading}
          className="flex-1 border border-stone-300 py-3 text-sm tracking-widest uppercase text-stone-600 hover:border-stone-500 transition-colors disabled:opacity-40"
        >
          {t("back")}
        </button>
        <button
          onClick={onSubmit}
          disabled={loading}
          className="flex-1 bg-stone-800 py-3 text-sm tracking-widest uppercase text-white hover:bg-stone-700 transition-colors disabled:opacity-40"
        >
          {loading ? t("loading") : t("summary.confirm")}
        </button>
      </div>
    </div>
  );
}
