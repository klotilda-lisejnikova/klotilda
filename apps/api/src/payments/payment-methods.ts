import { HttpError } from '@eleansphere/be-core';
import type { Sequelize } from '@eleansphere/be-core';
import { paymentFitsShipping, paymentMethodEntity } from '@klotilda/domain';
import type { PaymentKind, ShippingKind } from '@klotilda/domain';
import type { ModelRegistry } from '../models-registry';

const BAD_REQUEST = 400;

/** What the checkout charges and the order keeps of the method. */
export interface ChosenPayment {
  paymentName: string;
  paymentKind: PaymentKind;
  paymentFee: number;
}

type Transaction = Awaited<ReturnType<Sequelize['transaction']>>;

/**
 * The active method of that code, read in the order's transaction with its row locked (as the
 * shipping method is); a 400 the shop shows as "the cart changed" when it isn't offered or doesn't
 * go with the chosen shipping (cash only at a pickup).
 */
export async function resolveOfferedPayment(
  registry: ModelRegistry,
  code: string,
  shippingKind: ShippingKind,
  transaction: Transaction
): Promise<ChosenPayment> {
  const method = await registry.get(paymentMethodEntity.config.name).findOne({
    where: { code, active: true },
    lock: transaction.LOCK.UPDATE,
    transaction,
  });
  if (!method) throw new HttpError(BAD_REQUEST, 'Tento způsob platby už není v nabídce');
  const paymentKind = method.get('kind') as PaymentKind;
  if (!paymentFitsShipping(paymentKind, shippingKind)) {
    throw new HttpError(BAD_REQUEST, 'Tento způsob platby nejde s vybranou dopravou');
  }
  return {
    paymentName: String(method.get('name_cs')),
    paymentKind,
    paymentFee: Number(method.get('fee')),
  };
}
