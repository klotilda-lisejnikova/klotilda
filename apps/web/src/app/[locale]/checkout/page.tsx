"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { ApiError } from "@eleansphere/entity-core";
import { Link } from "@/i18n/navigation";
import { paymentFitsShipping } from "@klotilda/domain";
import {
  checkout,
  CheckoutResponse,
  listPaymentMethods,
  listShippingMethods,
  PaymentMethod,
  ShippingMethod,
} from "@/services";
import {
  isBlocked,
  useCart,
  useCartStore,
  useMounted,
} from "@/store/cart.store";
import { useCartCheck } from "@/store/use-cart-check";
import StepIndicator from "@/components/checkout/StepIndicator";
import Step1Contact from "@/components/checkout/Step1Contact";
import Step2Shipping from "@/components/checkout/Step2Shipping";
import Step3Payment from "@/components/checkout/Step3Payment";
import Step4Summary, {
  type SubmitError,
} from "@/components/checkout/Step4Summary";
import PaymentResult from "@/components/checkout/PaymentResult";
import CartLine from "@/components/shop/CartLine";
import { CheckoutData, INITIAL_CHECKOUT } from "@/components/checkout/types";

/** The API refuses an order whose lines no longer match the shop (sold out, gone, bad quantity). */
const CART_OUT_OF_DATE = [400, 409];
/** The last step lists every line itself. */
const SUMMARY_STEP = 3;
const SHIPPING_STEP = 1;
const PAYMENT_STEP = 2;

/** A list the step reads: `null` while it loads, `"error"` if that failed. */
type Loaded<T> = T[] | null | "error";

/** Loads a list once, for as long as the page is open. */
function useLoaded<T>(load: () => Promise<T[]>) {
  const [list, setList] = useState<Loaded<T>>(null);
  useEffect(() => {
    let current = true;
    load()
      .then((rows) => current && setList(rows))
      .catch(() => current && setList("error"));
    return () => {
      current = false;
    };
  }, [load]);
  return [list, setList] as const;
}

export default function CheckoutPage() {
  const t = useTranslations("checkout");
  const mounted = useMounted();
  const items = useCart();
  const clearCart = useCartStore((state) => state.clearCart);
  // The cart may have waited in the browser for days: check prices and stock on arrival.
  const { check } = useCartCheck(mounted);
  const [step, setStep] = useState(0);
  const [data, setData] = useState<CheckoutData>(INITIAL_CHECKOUT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<SubmitError | null>(null);
  const [result, setResult] = useState<CheckoutResponse | null>(null);
  // Read live, not baked into the page: the admin may change a price or hide a method any time.
  const [shippingMethods, setShippingMethods] =
    useLoaded<ShippingMethod>(listShippingMethods);
  const [paymentMethods, setPaymentMethods] =
    useLoaded<PaymentMethod>(listPaymentMethods);

  /** Set when the chosen method went away meanwhile: its step says so and asks for another. */
  const [shippingGone, setShippingGone] = useState(false);
  const [paymentGone, setPaymentGone] = useState(false);

  const changed = items.filter((item) => item.issue);

  const update = (patch: Partial<CheckoutData>) =>
    setData((prev) => ({ ...prev, ...patch }));

  /**
   * The methods as the API offers them now: a chosen method that is gone (or a payment that no
   * longer fits the shipping) sends the customer back to pick another, a changed price is taken
   * over.
   */
  const refreshMethods = (
    shipping: ShippingMethod[],
    payment: PaymentMethod[],
  ) => {
    setShippingMethods(shipping);
    setPaymentMethods(payment);
    const ship = shipping.find((method) => method.code === data.shippingMethod);
    if (!ship) {
      update({
        shippingMethod: "",
        shippingName: "",
        shippingPrice: 0,
        shippingKind: null,
      });
      setShippingGone(true);
      setStep(SHIPPING_STEP);
      return;
    }
    update({ shippingPrice: ship.price, shippingKind: ship.kind });
    const pay = payment.find(
      (method) =>
        method.code === data.paymentMethod &&
        paymentFitsShipping(method.kind, ship.kind),
    );
    if (!pay) {
      update({ paymentMethod: "", paymentName: "", paymentFee: 0 });
      setPaymentGone(true);
      setStep(PAYMENT_STEP);
      return;
    }
    update({ paymentFee: pay.fee });
    setError("cartChanged");
  };

  const handleSubmit = async () => {
    if (items.some(isBlocked) || !data.termsAccepted) return;
    setLoading(true);
    setError(null);
    try {
      // Only what was chosen goes out: the API prices the order itself.
      const placed = await checkout({
        customerFirstName: data.customerFirstName,
        customerLastName: data.customerLastName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone || undefined,
        street: data.street,
        city: data.city,
        zip: data.zip,
        shippingMethod: data.shippingMethod,
        paymentMethod: data.paymentMethod,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
        notes: data.notes || undefined,
        termsAccepted: true,
      });
      clearCart();
      setResult(placed);
    } catch (err) {
      if (err instanceof ApiError && CART_OUT_OF_DATE.includes(err.status)) {
        // Something changed meanwhile: refresh the lines and the methods, so the summary shows
        // what and why.
        const [, shipping, payment] = await Promise.all([
          check(),
          listShippingMethods().catch(() => null),
          listPaymentMethods().catch(() => null),
        ]);
        if (shipping && payment) refreshMethods(shipping, payment);
        else setError("cartChanged");
      } else {
        setError("failed");
      }
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <section className="mx-auto max-w-lg px-4 py-16 sm:px-6">
        <PaymentResult result={result} />
      </section>
    );
  }

  if (!mounted) {
    return <div className="min-h-[60vh]" aria-busy="true" />;
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-32 text-center">
        <p className="mb-6 text-stone-500">{t("emptyCart")}</p>
        <Link
          href="/shop"
          className="bg-moss hover:bg-moss-deep inline-block px-8 py-3 text-sm tracking-widest text-[#fafaf8] uppercase transition-colors"
        >
          {t("goToShop")}
        </Link>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <div className="mb-10 flex justify-center">
        <StepIndicator current={step} />
      </div>

      {/* Before the form, not only on the summary: a change found on arrival shows at once. */}
      {changed.length > 0 && step < SUMMARY_STEP && (
        <div
          className="mb-8 border border-amber-200 bg-amber-50/60 px-4 pt-4"
          role="status"
        >
          <p className="mb-3 text-sm text-stone-700">{t("cartChangedTitle")}</p>
          <ul className="flex flex-col gap-4">
            {changed.map((item) => (
              <CartLine key={item.productId} item={item} />
            ))}
          </ul>
        </div>
      )}

      {step === 0 && (
        <Step1Contact
          data={data}
          onChange={update}
          onNext={() => setStep(SHIPPING_STEP)}
        />
      )}
      {step === SHIPPING_STEP && (
        <Step2Shipping
          data={data}
          methods={shippingMethods}
          gone={shippingGone}
          onChange={(patch) => {
            setShippingGone(false);
            update(patch);
          }}
          onNext={() => setStep(PAYMENT_STEP)}
          onBack={() => setStep(0)}
        />
      )}
      {step === PAYMENT_STEP && (
        <Step3Payment
          data={data}
          methods={paymentMethods}
          gone={paymentGone}
          onChange={(patch) => {
            setPaymentGone(false);
            update(patch);
          }}
          onNext={() => setStep(SUMMARY_STEP)}
          onBack={() => setStep(SHIPPING_STEP)}
        />
      )}
      {step === SUMMARY_STEP && (
        <Step4Summary
          data={data}
          onChange={update}
          items={items}
          onSubmit={handleSubmit}
          onBack={() => setStep(PAYMENT_STEP)}
          loading={loading}
          error={error}
        />
      )}
    </section>
  );
}
