import { SHIPPING_PRICES, ShippingMethod } from "@/services";

export { SHIPPING_PRICES };

export interface CheckoutData {
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  customerPhone: string;
  street: string;
  city: string;
  zip: string;
  shippingMethod: ShippingMethod;
  shippingPrice: number;
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
  shippingMethod: "zasilkovna",
  shippingPrice: SHIPPING_PRICES.zasilkovna,
  notes: "",
  termsAccepted: false,
};
