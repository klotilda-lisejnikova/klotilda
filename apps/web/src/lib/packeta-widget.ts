import {
  formatPickupPointAddress,
  PACKETA_COUNTRY,
  PACKETA_VENDORS,
  PACKETA_WIDGET_SCRIPT,
} from "@klotilda/domain";

/**
 * Zásilkovna's public API key (`NEXT_PUBLIC_PACKETA_API_KEY`, the account's 16-character key, not
 * the API password). Unset, a method with pickup points can't be chosen.
 */
export const PACKETA_API_KEY = process.env.NEXT_PUBLIC_PACKETA_API_KEY ?? "";

/** The pickup point as the checkout keeps it until the order goes; the API asks Packeta again. */
export interface ChosenPickupPoint {
  id: string;
  name: string;
  address: string;
  /** A Z-BOX, opened with a code, rather than a staffed point. */
  box: boolean;
}

/** What the widget hands the callback (the fields the shop reads). */
interface PacketaPoint {
  id: string | number;
  name?: string;
  street?: string;
  city?: string;
  zip?: string;
  group?: string;
}

interface PacketaWidget {
  pick(
    apiKey: string,
    callback: (point: PacketaPoint | null) => void,
    options: Record<string, unknown>,
  ): void;
}

declare global {
  interface Window {
    Packeta?: { Widget: PacketaWidget };
  }
}

/** How long the script may take before the customer is told to try again. */
const LOAD_TIMEOUT_MS = 15_000;

let loading: Promise<PacketaWidget> | null = null;

/** Loads Packeta's script once, when the map is first wanted; a failure may be retried. */
function loadWidget(): Promise<PacketaWidget> {
  if (window.Packeta) return Promise.resolve(window.Packeta.Widget);
  loading ??= new Promise<PacketaWidget>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = PACKETA_WIDGET_SCRIPT;
    script.async = true;
    const fail = (reason: string) => {
      clearTimeout(timer);
      script.remove();
      reject(new Error(reason));
    };
    const timer = setTimeout(
      () => fail("Packeta widget took too long"),
      LOAD_TIMEOUT_MS,
    );
    script.onload = () => {
      if (!window.Packeta) return fail("Packeta widget missing");
      clearTimeout(timer);
      resolve(window.Packeta.Widget);
    };
    script.onerror = () => fail("Packeta widget failed to load");
    document.head.appendChild(script);
  }).catch((err: unknown) => {
    loading = null;
    throw err;
  });
  return loading;
}

function toChosenPoint(point: PacketaPoint): ChosenPickupPoint {
  return {
    id: String(point.id),
    name: point.name?.trim() || String(point.id),
    address: formatPickupPointAddress(point),
    box: point.group === "zbox",
  };
}

/**
 * Opens Packeta's map over the page; resolves the chosen point, or `null` when the customer closes
 * it or is no longer `wanted` once the script has loaded. Rejects when the map can't be loaded.
 */
export async function pickPacketaPoint(
  locale: string,
  wanted: () => boolean,
): Promise<ChosenPickupPoint | null> {
  const widget = await loadWidget();
  if (!wanted()) return null;
  return new Promise((resolve) =>
    widget.pick(
      PACKETA_API_KEY,
      (point) => resolve(point ? toChosenPoint(point) : null),
      {
        language: locale === "en" ? "en" : "cs",
        country: PACKETA_COUNTRY,
        vendors: PACKETA_VENDORS,
        appIdentity: `klotilda-${process.env.NEXT_PUBLIC_APP_VERSION ?? "web"}`,
      },
    ),
  );
}
