import {
  formatPickupPointAddress,
  PACKETA_COUNTRY,
  PACKETA_VALIDATE_URL,
  PACKETA_VENDORS,
} from '@klotilda/domain';
import type { PickupNetwork, PickupPointType } from '@klotilda/domain';

/** What an order keeps of its pickup point, as the carrier described it. */
export interface PickupPoint {
  pickupPointId: string;
  pickupPointName: string;
  pickupPointAddress: string;
  pickupPointType: PickupPointType;
}

/** The carrier refuses the point: it doesn't exist, is closed or full, or isn't one we send to. */
export interface RefusedPickupPoint {
  refused: true;
  /** The carrier's own words, for the log. */
  reasons: string[];
}

/**
 * Asks the carrier about the point the customer chose on its map. Throws
 * `PickupPointsUnavailable` when the carrier can't say (no key, unreachable, an unexpected answer).
 */
export type PickupPointValidator = (
  network: PickupNetwork,
  pointId: string
) => Promise<PickupPoint | RefusedPickupPoint>;

export class PickupPointsUnavailable extends Error {}

export interface PacketaValidatorOptions {
  /** The account's API key (`PACKETA_API_KEY`); unset, every point is unavailable. */
  apiKey: string | undefined;
  fetch?: typeof fetch;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 5000;
const ZBOX_GROUP = 'zbox';
/** What the order's columns hold (`VARCHAR(255)`); Packeta's own texts are far shorter. */
const STORED_TEXT_MAX_LENGTH = 255;

interface PacketaAnswer {
  isValid?: unknown;
  point?: { name?: unknown; group?: unknown; address?: unknown } | null;
  errors?: unknown;
}

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function describeErrors(answer: PacketaAnswer): string[] {
  const errors: unknown[] = Array.isArray(answer.errors) ? answer.errors : [];
  return errors
    .filter(isRecord)
    .map((error) => [text(error.code), text(error.description)].filter(Boolean).join(': '));
}

/** The point Packeta validated, in the order's words; a valid answer without a name is unusable. */
function toPickupPoint(pointId: string, answer: PacketaAnswer): PickupPoint {
  const name = text(answer.point?.name);
  if (!name) throw new PickupPointsUnavailable('Packeta validated the point but named none');
  const address = isRecord(answer.point?.address) ? answer.point.address : {};
  return {
    pickupPointId: pointId,
    pickupPointName: name.slice(0, STORED_TEXT_MAX_LENGTH),
    pickupPointAddress: formatPickupPointAddress({
      street: text(address.street),
      zip: text(address.zip),
      city: text(address.city),
    }).slice(0, STORED_TEXT_MAX_LENGTH),
    pickupPointType: text(answer.point?.group) === ZBOX_GROUP ? 'box' : 'point',
  };
}

/**
 * Packeta's own check of a chosen point (widget v6 `validate`): the map runs in the customer's
 * browser and can be bypassed, so the order takes the point's name and address from this answer.
 * It is limited to the countries and vendors the map offers.
 */
export function createPacketaValidator({
  apiKey,
  fetch: fetchImpl = fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: PacketaValidatorOptions): PickupPointValidator {
  return async (_network, pointId) => {
    if (!apiKey) throw new PickupPointsUnavailable('PACKETA_API_KEY is not set');
    let response: Response;
    try {
      response = await fetchImpl(PACKETA_VALIDATE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Language': 'cs' },
        body: JSON.stringify({
          apiKey,
          point: { id: pointId },
          options: { country: PACKETA_COUNTRY, vendors: PACKETA_VENDORS },
        }),
        signal: AbortSignal.timeout(timeoutMs),
        // A redirect would carry the key elsewhere.
        redirect: 'error',
      });
    } catch (err) {
      throw new PickupPointsUnavailable(`Packeta is unreachable: ${String(err)}`);
    }
    if (!response.ok) {
      throw new PickupPointsUnavailable(`Packeta answered HTTP ${response.status}`);
    }
    const parsed: unknown = await response.json().catch(() => undefined);
    const answer: PacketaAnswer = isRecord(parsed) ? parsed : {};
    if (answer.isValid === true) return toPickupPoint(pointId, answer);
    if (answer.isValid === false) return { refused: true, reasons: describeErrors(answer) };
    throw new PickupPointsUnavailable('Packeta answered without isValid');
  };
}
