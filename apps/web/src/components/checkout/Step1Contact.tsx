import { useTranslations } from "next-intl";
import { CheckoutData } from "./types";

interface Props {
  data: CheckoutData;
  onChange: (data: Partial<CheckoutData>) => void;
  onNext: () => void;
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
    opts: { required?: boolean; type?: string } = {},
  ) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs tracking-wide text-stone-500">{label}</label>
      <input
        type={opts.type ?? "text"}
        value={(data[key] as string) ?? ""}
        onChange={(e) => onChange({ [key]: e.target.value })}
        required={opts.required}
        className="border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-stone-500"
      />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        {field("customerFirstName", t("contact.firstName"), { required: true })}
        {field("customerLastName", t("contact.lastName"), { required: true })}
      </div>
      {field("customerEmail", t("contact.email"), { required: true, type: "email" })}
      {field("customerPhone", t("contact.phone"))}
      {field("street", t("contact.street"), { required: true })}
      <div className="grid grid-cols-2 gap-4">
        {field("city", t("contact.city"), { required: true })}
        {field("zip", t("contact.zip"), { required: true })}
      </div>
      <button
        type="submit"
        className="mt-2 bg-stone-800 py-3 text-sm tracking-widest uppercase text-white hover:bg-stone-700 transition-colors"
      >
        {t("next")}
      </button>
    </form>
  );
}
