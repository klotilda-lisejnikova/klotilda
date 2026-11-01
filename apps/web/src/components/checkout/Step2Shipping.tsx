import { useLocale, useTranslations } from "next-intl";
import { resolvePickupNetwork } from "@klotilda/domain";
import { ShippingMethod } from "@/services";
import MethodOption from "./MethodOption";
import PickupPointPicker from "./PickupPointPicker";
import { methodText } from "./method-text";
import { CheckoutData } from "./types";

interface Props {
  data: CheckoutData;
  /** The active methods from the API; `null` while they load, `"error"` if that failed. */
  methods: ShippingMethod[] | null | "error";
  /** The method chosen before is no longer offered. */
  gone: boolean;
  /** The method chosen before now sends to a pickup point, or no longer does. */
  changed: boolean;
  /** The shop refused the pickup point chosen before; another is needed. */
  pointRefused: boolean;
  onChange: (data: Partial<CheckoutData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function Step2Shipping({
  data,
  methods,
  gone,
  changed,
  pointRefused,
  onChange,
  onNext,
  onBack,
}: Props) {
  const t = useTranslations("checkout");
  const locale = useLocale();
  const offered = Array.isArray(methods) ? methods : [];
  const chosen = offered.find((method) => method.code === data.shippingMethod);
  const needsPoint = Boolean(data.pickupNetwork);
  const ready = Boolean(chosen) && (!needsPoint || data.pickupPoint !== null);

  const select = (method: ShippingMethod) => {
    if (method.code === data.shippingMethod) return;
    onChange({
      shippingMethod: method.code,
      shippingName: methodText(method, locale).name,
      shippingPrice: method.price,
      shippingKind: method.kind,
      pickupNetwork: resolvePickupNetwork(method),
      // A point belongs to the method it was chosen for.
      pickupPoint: null,
    });
  };

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
      {changed && (
        <p className="text-sm text-amber-800" role="alert">
          {t("shipping.changed")}
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
      {chosen && needsPoint && (
        <PickupPointPicker
          point={data.pickupPoint}
          refused={pointRefused}
          onPick={(pickupPoint) => onChange({ pickupPoint })}
        />
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 border border-stone-300 py-3 text-sm tracking-widest text-stone-600 uppercase transition-colors hover:border-stone-500"
        >
          {t("back")}
        </button>
        <button
          onClick={onNext}
          disabled={!ready}
          className="bg-moss hover:bg-moss-deep flex-1 py-3 text-sm tracking-widest text-[#fafaf8] uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("next")}
        </button>
      </div>
    </div>
  );
}
