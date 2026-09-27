import { useTranslations } from "next-intl";
import { ShippingMethod } from "@/services";
import { CheckoutData, SHIPPING_PRICES } from "./types";

interface Props {
  data: CheckoutData;
  onChange: (data: Partial<CheckoutData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const METHODS: ShippingMethod[] = ["zasilkovna", "ceska_posta", "osobni_odber"];

export default function Step2Shipping({ data, onChange, onNext, onBack }: Props) {
  const t = useTranslations("checkout");

  const select = (method: ShippingMethod) =>
    onChange({ shippingMethod: method, shippingPrice: SHIPPING_PRICES[method] });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        {METHODS.map((method) => {
          const price = SHIPPING_PRICES[method];
          const active = data.shippingMethod === method;
          return (
            <button
              key={method}
              type="button"
              onClick={() => select(method)}
              className={`flex items-center justify-between border px-4 py-3 text-left transition-colors ${
                active ? "border-stone-800 bg-stone-50" : "border-stone-200 hover:border-stone-400"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`h-4 w-4 shrink-0 rounded-full border-2 ${
                    active ? "border-stone-800 bg-stone-800" : "border-stone-300"
                  }`}
                />
                <span className="text-sm text-stone-800">{t(`shipping.${method}`)}</span>
              </div>
              <span className="text-sm text-stone-600">
                {price === 0 ? t("shipping.free") : `${price} ${t("currency")}`}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 border border-stone-300 py-3 text-sm tracking-widest uppercase text-stone-600 hover:border-stone-500 transition-colors"
        >
          {t("back")}
        </button>
        <button
          onClick={onNext}
          className="flex-1 bg-stone-800 py-3 text-sm tracking-widest uppercase text-white hover:bg-stone-700 transition-colors"
        >
          {t("next")}
        </button>
      </div>
    </div>
  );
}
