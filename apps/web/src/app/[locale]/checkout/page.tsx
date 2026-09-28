"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { ApiError } from "@eleansphere/entity-core";
import { Link } from "@/i18n/navigation";
import { checkout, CheckoutResponse } from "@/services";
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

  const changed = items.filter((item) => item.issue);

  const update = (patch: Partial<CheckoutData>) =>
    setData((prev) => ({ ...prev, ...patch }));

  const handleSubmit = async () => {
    if (items.some(isBlocked)) return;
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
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
        notes: data.notes || undefined,
      });
      clearCart();
      setResult(placed);
    } catch (err) {
      if (err instanceof ApiError && CART_OUT_OF_DATE.includes(err.status)) {
        // Something changed meanwhile: refresh the lines so the summary shows what and why.
        await check();
        setError("cartChanged");
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
        <Step1Contact data={data} onChange={update} onNext={() => setStep(1)} />
      )}
      {step === 1 && (
        <Step2Shipping
          data={data}
          onChange={update}
          onNext={() => setStep(2)}
          onBack={() => setStep(0)}
        />
      )}
      {step === 2 && (
        <Step3Payment onNext={() => setStep(3)} onBack={() => setStep(1)} />
      )}
      {step === 3 && (
        <Step4Summary
          data={data}
          onChange={update}
          items={items}
          onSubmit={handleSubmit}
          onBack={() => setStep(2)}
          loading={loading}
          error={error}
        />
      )}
    </section>
  );
}
