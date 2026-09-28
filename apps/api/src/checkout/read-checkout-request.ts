import { validateFields, ValidationError } from '@eleansphere/be-core';
import type { ValidationIssue } from '@eleansphere/schema';
import { customerFields, MAX_ITEM_QUANTITY, MAX_ORDER_LINES } from '@klotilda/domain';
import type { CheckoutItem, CheckoutRequest } from '@klotilda/domain';

const ITEMS_PATH = 'items';
const TERMS_ACCEPTED = 'termsAccepted';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function findItemIssues(items: unknown): ValidationIssue[] {
  if (!Array.isArray(items) || items.length === 0) {
    return [{ path: ITEMS_PATH, code: 'required', params: {} }];
  }
  if (items.length > MAX_ORDER_LINES) {
    return [{ path: ITEMS_PATH, code: 'max', params: { max: MAX_ORDER_LINES } }];
  }
  return items.flatMap((item, index): ValidationIssue[] => {
    const path = `${ITEMS_PATH}.${index}`;
    if (!isRecord(item) || typeof item.productId !== 'string' || item.productId === '') {
      return [{ path: `${path}.productId`, code: 'required', params: {} }];
    }
    const { quantity } = item;
    if (typeof quantity !== 'number' || !Number.isInteger(quantity)) {
      return [{ path: `${path}.quantity`, code: 'type', params: { type: 'INTEGER' } }];
    }
    if (quantity < 1) return [{ path: `${path}.quantity`, code: 'min', params: { min: 1 } }];
    if (quantity > MAX_ITEM_QUANTITY) {
      return [{ path: `${path}.quantity`, code: 'max', params: { max: MAX_ITEM_QUANTITY } }];
    }
    return [];
  });
}

/** The same product twice in the cart is one line with both quantities. */
function mergeLines(items: CheckoutItem[]): CheckoutItem[] {
  const quantities = new Map<string, number>();
  for (const { productId, quantity } of items) {
    quantities.set(productId, (quantities.get(productId) ?? 0) + quantity);
  }
  return [...quantities].map(([productId, quantity]) => ({ productId, quantity }));
}

/**
 * The checkout body, checked: the customer's details by the order's own field rules, the cart as
 * product ids and whole quantities. Anything else the client sends — prices, totals — is ignored.
 */
export function readCheckoutRequest(body: unknown): CheckoutRequest {
  const request = isRecord(body) ? body : {};
  const issues: ValidationIssue[] = [
    ...validateFields(customerFields, request, { mode: 'create' }),
    ...findItemIssues(request.items),
    // The customer must have ticked the terms; nothing else counts as agreeing.
    ...(request.termsAccepted === true
      ? []
      : [{ path: TERMS_ACCEPTED, code: 'required' as const, params: {} }]),
  ];
  if (issues.length > 0) throw new ValidationError(issues);

  const customer = Object.fromEntries(
    Object.keys(customerFields)
      .filter((name) => request[name] !== undefined)
      .map((name) => [name, request[name]])
  ) as Omit<CheckoutRequest, 'items' | 'termsAccepted'>;
  return {
    ...customer,
    items: mergeLines(request.items as CheckoutItem[]),
    termsAccepted: true,
  };
}
