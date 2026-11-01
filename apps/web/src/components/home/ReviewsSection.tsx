import { useTranslations } from "next-intl";
import type { PublicReviewsPage } from "@klotilda/domain";
import { Link } from "@/i18n/navigation";
import ReviewCard from "@/components/reviews/ReviewCard";
import ReviewStars from "@/components/reviews/ReviewStars";

/** The newest reviews on the home page, with the shop's average; nothing until there are any. */
export default function ReviewsSection({ page }: { page: PublicReviewsPage }) {
  const t = useTranslations("reviews");
  if (page.data.length === 0 || page.averageRating === null) return null;

  return (
    <section className="bg-paper py-20 md:py-28">
      <div className="mx-auto max-w-5xl px-4 md:px-8">
        <div className="text-center">
          <h2 className="font-serif text-3xl font-light tracking-[0.12em] text-stone-800 md:text-4xl">
            {t("latest")}
          </h2>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <ReviewStars
              rating={Math.round(page.averageRating)}
              label={t("stars", { rating: page.averageRating })}
            />
            <span className="text-sm text-stone-600">
              {t("average", { average: page.averageRating })} ·{" "}
              {t("count", { count: page.total })}
            </span>
          </div>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {page.data.map((review) => (
            <ReviewCard key={review.id} review={review} showItems={false} />
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link
            href="/recenze"
            className="hover:text-moss text-sm tracking-wide text-stone-700 underline underline-offset-4 transition-colors"
          >
            {t("all")}
          </Link>
        </div>
      </div>
    </section>
  );
}
