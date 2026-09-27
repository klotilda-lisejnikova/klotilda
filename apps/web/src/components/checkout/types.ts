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
};
