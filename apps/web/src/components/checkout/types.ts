import type { ShippingKind } from "@/services";

export interface CheckoutData {
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  customerPhone: string;
  street: string;
  city: string;
  zip: string;
  /** The chosen method's code; empty until one is picked. */
  shippingMethod: string;
  /** Its name in the page's language and its price, for the summary; the API charges its own. */
  shippingName: string;
  shippingPrice: number;
  /** Whether it is a pickup: cash is offered only then. */
  shippingKind: ShippingKind | null;
  /** The chosen payment method's code, name and fee, the same way. */
  paymentMethod: string;
  paymentName: string;
  paymentFee: number;
  notes: string;
  /** The terms box on the summary step; the order can't go without it. */
  termsAccepted: boolean;
}

export const INITIAL_CHECKOUT: CheckoutData = {
  customerFirstName: "",
  customerLastName: "",
  customerEmail: "",
  customerPhone: "",
  street: "",
  city: "",
  zip: "",
  shippingMethod: "",
  shippingName: "",
  shippingPrice: 0,
  shippingKind: null,
  paymentMethod: "",
  paymentName: "",
  paymentFee: 0,
  notes: "",
  termsAccepted: false,
};
