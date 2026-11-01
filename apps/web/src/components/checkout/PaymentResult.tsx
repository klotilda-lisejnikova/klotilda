import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { CheckoutResponse } from "@/services";

interface Props {
  result: CheckoutResponse;
}

/** After the order: the QR code and account for a transfer, a word on paying at pickup for cash. */
export default function PaymentResult({ result }: Props) {
  const t = useTranslations("checkoutResult");
  const transfer = result.paymentKind === "bank_transfer" ? result : null;

  return (
    <div className="mx-auto max-w-md text-center">
      <div className="mb-6 text-4xl">✓</div>
      <h1 className="mb-3 text-2xl font-light tracking-wide text-stone-800">
        {t("successTitle")}
      </h1>
      <p className="mb-8 text-sm text-stone-500">
        {transfer ? t("successBody") : t("successBodyCash")}
      </p>

      {transfer && (
        <div className="mx-auto mb-6 flex w-fit flex-col items-center gap-4 border border-stone-200 bg-stone-50 p-6">
          {/* eslint-disable-next-line @next/next/no-img-element -- data: URL, nothing for next/image to optimize */}
          <img
            src={transfer.qrCodeDataUrl}
            alt={t("qrAlt")}
            width={220}
            height={220}
          />
          <p className="text-xs text-stone-400">{t("qrHint")}</p>
        </div>
      )}

      <dl className="mx-auto mb-8 flex max-w-xs flex-col gap-2 text-left text-sm">
        {transfer && (
          <div className="flex justify-between border-b border-stone-100 pb-2">
            <dt className="text-stone-400">{t("account")}</dt>
            <dd className="font-medium text-stone-800">
              {transfer.bankAccount}
            </dd>
          </div>
        )}
        <div className="flex justify-between border-b border-stone-100 pb-2">
          <dt className="text-stone-400">
            {transfer ? t("variableSymbol") : t("orderNumber")}
          </dt>
          <dd className="font-medium text-stone-800">
            {result.variableSymbol}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-stone-400">
            {transfer ? t("amount") : t("amountAtPickup")}
          </dt>
          <dd className="font-medium text-stone-800">
            {result.amount.toLocaleString("cs-CZ")}&nbsp;Kč
          </dd>
        </div>
      </dl>

      <Link
        href="/"
        className="inline-block border border-stone-300 px-8 py-3 text-sm tracking-widest text-stone-700 uppercase transition-colors hover:border-stone-600"
      >
        {t("backHome")}
      </Link>
    </div>
  );
}
