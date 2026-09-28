import type { OrderStatus, PaymentStatus, ShippingMethod } from '@klotilda/domain';
import type { BadgeProps } from '@nuxt/ui';

type BadgeColor = NonNullable<BadgeProps['color']>;

export const SHIPPING_LABELS: Record<ShippingMethod, string> = {
  zasilkovna: 'Zásilkovna',
  ceska_posta: 'Česká pošta',
  osobni_odber: 'Osobní odběr',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Čeká na platbu',
  paid: 'Zaplaceno',
  failed: 'Neproběhla',
  refunded: 'Vráceno',
};

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, BadgeColor> = {
  pending: 'warning',
  paid: 'success',
  failed: 'error',
  refunded: 'neutral',
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'Nová',
  processing: 'Zpracovávám',
  shipped: 'Odesláno',
  delivered: 'Doručeno',
  cancelled: 'Zrušeno',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, BadgeColor> = {
  new: 'info',
  processing: 'warning',
  shipped: 'primary',
  delivered: 'success',
  cancelled: 'neutral',
};

/** `USelect` items from a label map, in its order. */
export function toSelectItems<T extends string>(labels: Record<T, string>) {
  return (Object.entries(labels) as [T, string][]).map(([value, label]) => ({ value, label }));
}
