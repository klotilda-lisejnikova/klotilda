import { useTranslations } from "next-intl";
import type { PublicReviewsPage } from "@klotilda/domain";
import { Link } from "@/i18n/navigation";
import ReviewCard from "./ReviewCard";
import ReviewStars from "./ReviewStars";

/**
 * The end of the shop page, above the footer: the average, the count, the newest reviews and a
 * link to all of them; nothing until one is published.
 */
export default function ShopReviews({ page }: { page: PublicReviewsPage }) {
  const t = useTranslations("reviews");
  if (page.averageRating === null) return null;

  return (
    <div className="mt-20 border-t border-stone-200 pt-12 md:mt-28">
      <h2 className="font-serif text-2xl font-light tracking-[0.08em] text-stone-800 md:text-3xl">
        {t("shopLink")}
      </h2>
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-600">
        <ReviewStars
          rating={Math.round(page.averageRating)}
          label={t("stars", { rating: page.averageRating })}
        />
        <span>
          {t("average", { average: page.averageRating })} ·{" "}
          {t("count", { count: page.total })}
        </span>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {page.data.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>

      <Link
        href="/shop/recenze"
        className="hover:text-moss mt-8 inline-block text-sm text-stone-600 underline underline-offset-4 transition-colors"
      >
        {t("all")}
      </Link>
    </div>
  );
}
