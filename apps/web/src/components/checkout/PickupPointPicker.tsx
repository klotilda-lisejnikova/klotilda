import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ChosenPickupPoint,
  PACKETA_API_KEY,
  pickPacketaPoint,
} from "@/lib/packeta-widget";

interface Props {
  point: ChosenPickupPoint | null;
  /** The previous point was refused by the shop: the customer is asked for another. */
  refused: boolean;
  onPick: (point: ChosenPickupPoint) => void;
}

/** Under a method that ships to Zásilkovna: the chosen point, or the button to choose one. */
export default function PickupPointPicker({ point, refused, onPick }: Props) {
  const t = useTranslations("checkout.pickupPoint");
  const locale = useLocale();
  const [opening, setOpening] = useState(false);
  const [failed, setFailed] = useState(false);
  // A map that opens after the customer left this method must not choose for another.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  if (!PACKETA_API_KEY) {
    return (
      <p className="text-sm text-amber-800" role="alert">
        {t("unavailable")}
      </p>
    );
  }

  const open = async () => {
    setOpening(true);
    setFailed(false);
    try {
      const chosen = await pickPacketaPoint(locale, () => mounted.current);
      if (chosen && mounted.current) onPick(chosen);
    } catch {
      if (mounted.current) setFailed(true);
    } finally {
      if (mounted.current) setOpening(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 border border-stone-200 bg-white px-4 py-3">
      {refused && !point && (
        <p className="text-sm text-amber-800" role="alert">
          {t("refused")}
        </p>
      )}
      {point ? (
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col">
            <span className="text-xs tracking-wide text-stone-500">
              {point.box ? t("chosenBox") : t("chosen")}
            </span>
            <span className="text-sm text-stone-800">{point.name}</span>
            {point.address && (
              <span className="text-xs text-stone-500">{point.address}</span>
            )}
          </div>
          <button
            type="button"
            onClick={open}
            disabled={opening}
            className="text-moss shrink-0 text-sm underline underline-offset-2 disabled:opacity-50"
          >
            {t("change")}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={open}
          disabled={opening}
          className="border-moss text-moss hover:bg-moss/5 border py-2.5 text-sm tracking-wide transition-colors disabled:opacity-50"
        >
          {opening ? t("opening") : t("choose")}
        </button>
      )}
      {failed && (
        <p className="text-sm text-red-700" role="alert">
          {t("failed")}
        </p>
      )}
    </div>
  );
}
