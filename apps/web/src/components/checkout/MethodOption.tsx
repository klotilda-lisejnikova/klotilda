interface Props {
  name: string;
  description?: string | null;
  /** What it costs, already worded ("Zdarma", "99 Kč"). */
  price: string;
  selected: boolean;
  onSelect: () => void;
}

/** One choice of a checkout step — a shipping or a payment method — as a radio-like button. */
export default function MethodOption({
  name,
  description,
  price,
  selected,
  onSelect,
}: Props) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex items-center justify-between gap-4 border px-4 py-3 text-left transition-colors ${
        selected
          ? "border-moss bg-moss/5"
          : "border-stone-200 hover:border-stone-400"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`h-4 w-4 shrink-0 rounded-full border-2 ${
            selected ? "border-moss bg-moss" : "border-stone-300"
          }`}
        />
        <span className="flex flex-col">
          <span className="text-sm text-stone-800">{name}</span>
          {description && (
            <span className="mt-0.5 text-xs text-stone-500">{description}</span>
          )}
        </span>
      </div>
      <span className="shrink-0 text-sm text-stone-600">{price}</span>
    </button>
  );
}
