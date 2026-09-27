import { useTranslations } from "next-intl";

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export default function Step3Payment({ onNext, onBack }: Props) {
  const t = useTranslations("checkout");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-4 border border-stone-200 bg-stone-50 px-4 py-4">
        <span className="text-2xl">📱</span>
        <div>
          <p className="text-sm font-medium text-stone-800">{t("payment.qr")}</p>
          <p className="mt-0.5 text-xs text-stone-400">{t("payment.qrDesc")}</p>
        </div>
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
