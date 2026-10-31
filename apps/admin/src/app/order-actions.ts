import type { QueryClient } from '@tanstack/vue-query';
import { parseOrderHistory } from '@klotilda/domain';
import type { Order, OrderAction } from '@klotilda/domain';
import { NOTIFYING_ACTIONS } from './labels';

/** Whether the customer is e-mailed: only for an action that has an e-mail, and only if wanted. */
export function shouldNotify(action: OrderAction, wanted: boolean): boolean {
  return NOTIFYING_ACTIONS.includes(action) && wanted;
}

/** The action went through but its e-mail to the customer did not (its history line says so). */
export function emailFailed(updated: Order): boolean {
  return parseOrderHistory(updated).at(-1)?.email === 'failed';
}

/** An action changes the order, the lists it appears in and, on cancelling, the stock. */
export function refreshAfterOrderAction(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: ['orders'] });
  void queryClient.invalidateQueries({ queryKey: ['order'] });
  void queryClient.invalidateQueries({ queryKey: ['products'] });
}
