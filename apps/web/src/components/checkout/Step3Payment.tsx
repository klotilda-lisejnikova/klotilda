import { useLocale, useTranslations } from "next-intl";
import { paymentFitsShipping } from "@klotilda/domain";
import { PaymentMethod } from "@/services";
import MethodOption from "./MethodOption";
import { methodText } from "./method-text";
import { CheckoutData } from "./types";

interface Props {
  data: CheckoutData;
  /** The active methods from the API; `null` while they load, `"error"` if that failed. */
  methods: PaymentMethod[] | null | "error";
  /** The method chosen before is no longer offered. */
  gone: boolean;
  onChange: (data: Partial<CheckoutData>) => void;
  onNext: () => void;
  onBack: () => void;
}

/** The methods that go with the chosen shipping: cash only with a pickup. */
function fitting(
  methods: Props["methods"],
  shippingKind: CheckoutData["shippingKind"],
): PaymentMethod[] {
  if (!Array.isArray(methods) || !shippingKind) return [];
  return methods.filter((method) =>
    paymentFitsShipping(method.kind, shippingKind),
  );
}

export default function Step3Payment({
  data,
  methods,
  gone,
  onChange,
  onNext,
  onBack,
}: Props) {
  const t = useTranslations("checkout");
  const locale = useLocale();
  const offered = fitting(methods, data.shippingKind);
  const chosen = offered.some((method) => method.code === data.paymentMethod);

  const select = (method: PaymentMethod) =>
    onChange({
      paymentMethod: method.code,
      paymentName: methodText(method, locale).name,
      paymentFee: method.fee,
    });

  return (
    <div className="flex flex-col gap-6">
      {methods === null && (
        <p className="text-sm text-stone-500" aria-busy="true">
          {t("payment.loading")}
        </p>
      )}
      {gone && (
        <p className="text-sm text-amber-800" role="alert">
          {t("payment.gone")}
        </p>
      )}
      {Array.isArray(methods) && offered.length === 0 && (
        <p className="text-sm text-red-700" role="alert">
          {t("payment.none")}
        </p>
      )}
      {methods === "error" && (
        <p className="text-sm text-red-700" role="alert">
          {t("payment.unavailable")}
        </p>
      )}
      <div className="flex flex-col gap-3">
        {offered.map((method) => (
          <MethodOption
            key={method.code}
            {...methodText(method, locale)}
            price={
              method.fee === 0
                ? ""
                : `+ ${method.fee.toLocaleString("cs-CZ")} ${t("currency")}`
            }
            selected={data.paymentMethod === method.code}
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
