import { MAX_RATING } from "@klotilda/domain";

const STAR =
  "M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9z";

/** Filled stars up to `rating`, outlined ones after; `label` names the rating for screen readers. */
export default function ReviewStars({
  rating,
  label,
  className = "h-4 w-4",
}: {
  rating: number;
  label: string;
  className?: string;
}) {
  return (
    <span role="img" aria-label={label} className="inline-flex gap-0.5">
      {Array.from({ length: MAX_RATING }, (_, index) => (
        <svg
          key={index}
          viewBox="0 0 20 20"
          aria-hidden="true"
          className={`${className} ${index < rating ? "text-moss" : "text-stone-300"}`}
        >
          <path d={STAR} fill="currentColor" />
        </svg>
      ))}
    </span>
  );
}
