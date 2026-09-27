import { useTranslations } from "next-intl";

const STEPS = ["contact", "shipping", "payment", "summary"] as const;

interface Props {
  current: number;
}

export default function StepIndicator({ current }: Props) {
  const t = useTranslations("checkout.steps");

  return (
    <ol className="flex items-center gap-0">
      {STEPS.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={step} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs transition-colors ${
                  done
                    ? "bg-stone-800 text-white"
                    : active
                      ? "border-2 border-stone-800 text-stone-800"
                      : "border border-stone-300 text-stone-400"
                }`}
              >
                {done ? (
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`hidden text-[10px] tracking-wide sm:block ${
                  active ? "text-stone-800" : "text-stone-400"
                }`}
              >
                {t(step)}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`mx-2 h-px w-8 sm:w-16 ${done ? "bg-stone-800" : "bg-stone-200"}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
