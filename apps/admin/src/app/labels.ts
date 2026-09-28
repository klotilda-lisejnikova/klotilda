import type {
  OrderAction,
  OrderEvent,
  OrderStatus,
  PaymentStatus,
  ShippingMethod,
} from '@klotilda/domain';
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
  processing: 'Připravuji',
  ready: 'K vyzvednutí',
  shipped: 'Odesláno',
  delivered: 'Doručeno',
  cancelled: 'Zrušeno',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, BadgeColor> = {
  new: 'info',
  processing: 'warning',
  ready: 'secondary',
  shipped: 'primary',
  delivered: 'success',
  cancelled: 'neutral',
};

/** What the admin can do with an order: button, icon and what it will do. */
export const ORDER_ACTION_LABELS: Record<OrderAction, string> = {
  'mark-paid': 'Platba dorazila',
  ship: 'Odeslat',
  'ready-for-pickup': 'Připraveno k vyzvednutí',
  'mark-delivered': 'Předáno zákazníkovi',
  cancel: 'Zrušit objednávku',
  'mark-refunded': 'Peníze vráceny',
};

export const ORDER_ACTION_ICONS: Record<OrderAction, string> = {
  'mark-paid': 'i-lucide-banknote',
  ship: 'i-lucide-truck',
  'ready-for-pickup': 'i-lucide-hand-heart',
  'mark-delivered': 'i-lucide-package-check',
  cancel: 'i-lucide-x',
  'mark-refunded': 'i-lucide-undo-2',
};

export const ORDER_ACTION_HINTS: Record<OrderAction, string> = {
  'mark-paid':
    'Objednávka se označí jako zaplacená a zákazník dostane potvrzení, že platba dorazila.',
  ship: 'Zákazník dostane e-mail, že je zásilka na cestě, s číslem zásilky a odkazem na sledování.',
  'ready-for-pickup':
    'Zákazník dostane e-mail, že si objednávku může vyzvednout. Napište mu, kde a kdy — jinak ho e-mail požádá, ať se ozve.',
  'mark-delivered': 'Objednávka se uzavře. Zákazníkovi nic nepřijde.',
  cancel: 'Zákazník dostane e-mail o zrušení; zaplacenou objednávku mu slíbí vrátit peníze.',
  'mark-refunded': 'Zákazník dostane e-mail, že jste mu peníze poslali zpět.',
};

/** Actions that would send the customer an e-mail. */
export const NOTIFYING_ACTIONS: readonly OrderAction[] = [
  'mark-paid',
  'ship',
  'ready-for-pickup',
  'cancel',
  'mark-refunded',
];

export const ORDER_EVENT_LABELS: Record<OrderEvent['type'], string> = {
  placed: 'Objednávka přijata',
  'mark-paid': 'Platba dorazila',
  ship: 'Odesláno',
  'ready-for-pickup': 'Připraveno k vyzvednutí',
  'mark-delivered': 'Předáno zákazníkovi',
  cancel: 'Zrušeno',
  'mark-refunded': 'Peníze vráceny',
};

export const EMAIL_OUTCOME_LABELS: Record<NonNullable<OrderEvent['email']>, string> = {
  sent: 'e-mail odešel',
  failed: 'e-mail se nepodařilo odeslat',
  skipped: 'bez e-mailu',
};

/** `USelect` items from a label map, in its order. */
export function toSelectItems<T extends string>(labels: Record<T, string>) {
  return (Object.entries(labels) as [T, string][]).map(([value, label]) => ({ value, label }));
}
