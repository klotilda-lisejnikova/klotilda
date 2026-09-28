import { useTranslations } from "next-intl";
import { CheckoutData } from "./types";

interface Props {
  data: CheckoutData;
  onChange: (data: Partial<CheckoutData>) => void;
  onNext: () => void;
}

interface FieldOptions {
  required?: boolean;
  type?: string;
  /** The browser's autofill hint, so saved contact details fill in with one tap. */
  autoComplete: string;
}

export default function Step1Contact({ data, onChange, onNext }: Props) {
  const t = useTranslations("checkout");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext();
  };

  const field = (
    key: keyof CheckoutData,
    label: string,
    opts: FieldOptions,
  ) => {
    const id = `checkout-${key}`;
    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={id} className="text-xs tracking-wide text-stone-500">
          {label}
        </label>
        <input
          id={id}
          name={key}
          type={opts.type ?? "text"}
          autoComplete={opts.autoComplete}
          value={(data[key] as string) ?? ""}
          onChange={(e) => onChange({ [key]: e.target.value })}
          required={opts.required}
          className="border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-stone-500"
        />
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        {field("customerFirstName", t("contact.firstName"), {
          required: true,
          autoComplete: "given-name",
        })}
        {field("customerLastName", t("contact.lastName"), {
          required: true,
          autoComplete: "family-name",
        })}
      </div>
      {field("customerEmail", t("contact.email"), {
        required: true,
        type: "email",
        autoComplete: "email",
      })}
      {field("customerPhone", t("contact.phone"), {
        type: "tel",
        autoComplete: "tel",
      })}
      {field("street", t("contact.street"), {
        required: true,
        autoComplete: "street-address",
      })}
      <div className="grid grid-cols-2 gap-4">
        {field("city", t("contact.city"), {
          required: true,
          autoComplete: "address-level2",
        })}
        {field("zip", t("contact.zip"), {
          required: true,
          autoComplete: "postal-code",
        })}
      </div>
      <button
        type="submit"
        className="bg-moss hover:bg-moss-deep mt-2 py-3 text-sm tracking-widest text-[#fafaf8] uppercase transition-colors"
      >
        {t("next")}
      </button>
    </form>
  );
}
