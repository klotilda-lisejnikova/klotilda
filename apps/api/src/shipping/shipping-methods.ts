import { HttpError } from '@eleansphere/be-core';
import type { Sequelize } from '@eleansphere/be-core';
import { PICKUP_POINT_ID_PATTERN, shippingMethodEntity } from '@klotilda/domain';
import type { PickupNetwork, ShippingKind } from '@klotilda/domain';
import type { ModelRegistry } from '../models-registry';
import { PickupPointsUnavailable } from './pickup-points';
import type { PickupPoint, PickupPointValidator } from './pickup-points';

const BAD_REQUEST = 400;
const SERVICE_UNAVAILABLE = 503;
const PICKUP_POINT_FIELD = 'pickupPointId';
const METHOD_CHANGED = 'Tento způsob dopravy už není v nabídce';

/** What the checkout charges and the order keeps of the method. */
export interface ChosenShipping {
  shippingName: string;
  shippingKind: ShippingKind;
  shippingPrice: number;
}

/** The method as locked for the order: what it charges, and where its parcels go. */
export interface OfferedShipping {
  shipping: ChosenShipping;
  pickupNetwork: PickupNetwork | null;
}

type Transaction = Awaited<ReturnType<Sequelize['transaction']>>;

/** The method's pickup network; a pickup (the customer collects from the artist) has none. */
function networkOf(method: { get(key: string): unknown } | null): PickupNetwork | null {
  if (!method || method.get('kind') !== 'delivery') return null;
  const network = method.get('pickupNetwork');
  return network ? (network as PickupNetwork) : null;
}

/**
 * The active method of that code, read in the order's transaction with its row locked, so an
 * admin hiding or repricing it at that moment waits for the order; else a 400 the shop shows as
 * "the cart changed".
 */
export async function resolveOfferedShipping(
  registry: ModelRegistry,
  code: string,
  transaction: Transaction
): Promise<OfferedShipping> {
  const method = await registry.get(shippingMethodEntity.config.name).findOne({
    where: { code, active: true },
    lock: transaction.LOCK.UPDATE,
    transaction,
  });
  if (!method) throw new HttpError(BAD_REQUEST, METHOD_CHANGED);
  return {
    shipping: {
      shippingName: String(method.get('name_cs')),
      shippingKind: method.get('kind') as ShippingKind,
      shippingPrice: Number(method.get('price')),
    },
    pickupNetwork: networkOf(method),
  };
}

/**
 * The pickup point the order goes to, for an active method with a `pickupNetwork`: the carrier is
 * asked about the customer's choice before the order's transaction (so a slow carrier never holds
 * the stock locks), and the order keeps the carrier's description of it. Any other method, or one
 * no longer offered (the transaction refuses it), goes to no point.
 */
export async function resolvePickupPoint(
  registry: ModelRegistry,
  validate: PickupPointValidator,
  { shippingMethod, pickupPointId }: { shippingMethod: string; pickupPointId?: string | null }
): Promise<PickupPoint | undefined> {
  const method = await registry
    .get(shippingMethodEntity.config.name)
    .findOne({ where: { code: shippingMethod, active: true } });
  const network = networkOf(method);
  if (!network) return undefined;

  const pointId = pickupPointId?.trim() ?? '';
  if (!pointId) {
    throw new HttpError(BAD_REQUEST, 'Vyberte výdejní místo', [
      { path: PICKUP_POINT_FIELD, code: 'required', params: {} },
    ]);
  }
  if (!PICKUP_POINT_ID_PATTERN.test(pointId)) {
    throw new HttpError(BAD_REQUEST, 'Výdejní místo se nepodařilo rozpoznat, vyberte ho znovu', [
      { path: PICKUP_POINT_FIELD, code: 'format', params: {} },
    ]);
  }
  try {
    const point = await validate(network, pointId);
    if (!('refused' in point)) return point;
    console.warn(`Pickup point ${pointId} refused: ${point.reasons.join('; ') || 'no reason'}`);
  } catch (err) {
    if (!(err instanceof PickupPointsUnavailable)) throw err;
    console.error(`Checking pickup point ${pointId} failed: ${err.message}`);
    // be-core answers a 5xx with its generic message; the web words this status itself.
    throw new HttpError(SERVICE_UNAVAILABLE, 'Pickup point check unavailable');
  }
  throw new HttpError(
    BAD_REQUEST,
    'Toto výdejní místo teď zásilky nepřijímá, vyberte prosím jiné',
    [{ path: PICKUP_POINT_FIELD, code: 'reference', params: {} }]
  );
}

/**
 * The point checked before the transaction, held against the method as locked inside it: an admin
 * adding or removing the method's pickup network in between refuses the order (the customer chose
 * under the old rules).
 */
export function pickupPointFor(
  networkInTransaction: PickupNetwork | null,
  point: PickupPoint | undefined
): PickupPoint | undefined {
  if (Boolean(networkInTransaction) !== Boolean(point)) {
    throw new HttpError(BAD_REQUEST, METHOD_CHANGED);
  }
  return point;
}
