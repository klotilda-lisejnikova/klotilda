import { HttpError, ValidationError } from '@eleansphere/be-core';
import type { CrudHook } from '@eleansphere/be-core';
import { shippingMethodEntity, toShippingCode } from '@klotilda/domain';
import type { ShippingKind } from '@klotilda/domain';
import type { ModelRegistry } from '../models-registry';

const BAD_REQUEST = 400;

/** `routes.ShippingMethod.hooks`: the code is stored normalized; one with nothing left is refused. */
export const normalizeShippingCode: CrudHook = async (data) => {
  if (data.code === undefined) return data;
  const code = toShippingCode(String(data.code));
  if (!code) throw new ValidationError([{ path: 'code', code: 'format' }]);
  return { ...data, code };
};

/** What the checkout charges and the order keeps of the method. */
export interface ChosenShipping {
  shippingName: string;
  shippingKind: ShippingKind;
  shippingPrice: number;
}

/** The active method of that code, or a 400 the shop shows as "the cart changed". */
export async function findOfferedShipping(
  registry: ModelRegistry,
  code: string
): Promise<ChosenShipping> {
  const method = await registry
    .get(shippingMethodEntity.config.name)
    .findOne({ where: { code, active: true } });
  if (!method) throw new HttpError(BAD_REQUEST, 'Tento způsob dopravy už není v nabídce');
  return {
    shippingName: String(method.get('name_cs')),
    shippingKind: method.get('kind') as ShippingKind,
    shippingPrice: Number(method.get('price')),
  };
}
