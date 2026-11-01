import { useLocale, useTranslations } from "next-intl";
import { ShippingMethod } from "@/services";
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

/** A method's name and description in the page's language, Czech where English is missing. */
function shippingText(method: ShippingMethod, locale: string) {
  const english = locale === "en";
  return {
    name: (english && method.name_en) || method.name_cs,
    description: (english && method.description_en) || method.description_cs,
  };
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
      shippingName: shippingText(method, locale).name,
      shippingPrice: method.price,
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
        {offered.map((method) => {
          const { name, description } = shippingText(method, locale);
          const active = data.shippingMethod === method.code;
          return (
            <button
              key={method.code}
              type="button"
              onClick={() => select(method)}
              aria-pressed={active}
              className={`flex items-center justify-between gap-4 border px-4 py-3 text-left transition-colors ${
                active
                  ? "border-moss bg-moss/5"
                  : "border-stone-200 hover:border-stone-400"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`h-4 w-4 shrink-0 rounded-full border-2 ${
                    active ? "border-moss bg-moss" : "border-stone-300"
                  }`}
                />
                <span className="flex flex-col">
                  <span className="text-sm text-stone-800">{name}</span>
                  {description && (
                    <span className="mt-0.5 text-xs text-stone-500">
                      {description}
                    </span>
                  )}
                </span>
              </div>
              <span className="shrink-0 text-sm text-stone-600">
                {method.price === 0
                  ? t("shipping.free")
                  : `${method.price.toLocaleString("cs-CZ")} ${t("currency")}`}
              </span>
            </button>
          );
        })}
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
