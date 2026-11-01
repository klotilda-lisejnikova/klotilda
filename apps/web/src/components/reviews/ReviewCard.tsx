import { useFormatter, useLocale, useTranslations } from "next-intl";
import type { PublicReview } from "@klotilda/domain";
import ReviewStars from "./ReviewStars";

/**
 * One published review: the stars, the customer's words as written, the name they chose, the
 * pieces they bought (named as when ordered, not linked: a sold original's page goes) and the
 * artist's reply. A review in the other language is marked as such.
 */
export default function ReviewCard({
  review,
  showItems = true,
}: {
  review: PublicReview;
  showItems?: boolean;
}) {
  const t = useTranslations("reviews");
  const format = useFormatter();
  const locale = useLocale();

  return (
    <article className="border border-stone-200 bg-white px-5 py-6 md:px-7">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <ReviewStars
          rating={review.rating}
          label={t("stars", { rating: review.rating })}
        />
        <span className="text-sm font-medium text-stone-800">
          {review.authorName}
        </span>
        <time
          dateTime={review.createdAt}
          className="ml-auto text-xs tracking-wide text-stone-500"
        >
          {format.dateTime(new Date(review.createdAt), { dateStyle: "long" })}
        </time>
      </div>

      <p
        className="mt-4 leading-relaxed whitespace-pre-line text-stone-700"
        lang={review.locale}
      >
        {review.body}
      </p>
      {review.locale !== locale && (
        <p className="mt-2 text-xs text-stone-500">{t("otherLanguage")}</p>
      )}

      {showItems && review.items.length > 0 && (
        <p className="mt-4 text-xs text-stone-500">
          {t("bought")} {review.items.map((item) => item.name).join(", ")}
        </p>
      )}

      {review.reply && (
        <div className="border-moss/40 mt-5 border-l-2 pl-4">
          <p className="text-[0.65rem] tracking-[0.2em] text-stone-500 uppercase">
            {t("reply")}
          </p>
          <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-stone-700">
            {review.reply}
          </p>
        </div>
      )}
    </article>
  );
}
