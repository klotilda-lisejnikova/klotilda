import { useLocale, useTranslations } from "next-intl";
import { ShippingMethod } from "@/services";
import MethodOption from "./MethodOption";
import { methodText } from "./method-text";
import { CheckoutData } from "./types";

interface Props {
  data: CheckoutData;
  /** The active methods from the API; `null` while they load, `"error"` if that failed. */
  methods: ShippingMethod[] | null | "error";
  /** The method chosen before is no longer offered. */
  gone: boolean;
  onChange: (data: Partial<CheckoutData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function Step2Shipping({
  data,
  methods,
  gone,
  onChange,
  onNext,
  onBack,
}: Props) {
  const t = useTranslations("checkout");
  const locale = useLocale();
  const offered = Array.isArray(methods) ? methods : [];
  const chosen = offered.some((method) => method.code === data.shippingMethod);

  const select = (method: ShippingMethod) =>
    onChange({
      shippingMethod: method.code,
      shippingName: methodText(method, locale).name,
      shippingPrice: method.price,
      shippingKind: method.kind,
    });

  return (
    <div className="flex flex-col gap-6">
      {methods === null && (
        <p className="text-sm text-stone-500" aria-busy="true">
          {t("shipping.loading")}
        </p>
      )}
      {gone && (
        <p className="text-sm text-amber-800" role="alert">
          {t("shipping.gone")}
        </p>
      )}
      {Array.isArray(methods) && methods.length === 0 && (
        <p className="text-sm text-red-700" role="alert">
          {t("shipping.none")}
        </p>
      )}
      {methods === "error" && (
        <p className="text-sm text-red-700" role="alert">
          {t("shipping.unavailable")}
        </p>
      )}
      <div className="flex flex-col gap-3">
        {offered.map((method) => (
          <MethodOption
            key={method.code}
            {...methodText(method, locale)}
            price={
              method.price === 0
                ? t("shipping.free")
                : `${method.price.toLocaleString("cs-CZ")} ${t("currency")}`
            }
            selected={data.shippingMethod === method.code}
            onSelect={() => select(method)}
          />
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 border border-stone-300 py-3 text-sm tracking-widest text-stone-600 uppercase transition-colors hover:border-stone-500"
        >
          {t("back")}
        </button>
        <button
          onClick={onNext}
          disabled={!chosen}
          className="bg-moss hover:bg-moss-deep flex-1 py-3 text-sm tracking-widest text-[#fafaf8] uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("next")}
        </button>
      </div>
    </div>
  );
}
