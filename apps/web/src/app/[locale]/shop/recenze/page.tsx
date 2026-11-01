import { getTranslations, setRequestLocale } from "next-intl/server";
import { PUBLIC_REVIEWS_MAX_LIMIT } from "@klotilda/domain";
import ReviewCard from "@/components/reviews/ReviewCard";
import ReviewStars from "@/components/reviews/ReviewStars";
import { loadReviews } from "@/lib/reviews";
import { Link } from "@/i18n/navigation";

/**
 * The newest published reviews; the admin's decisions rebuild the page at once
 * (`/api/revalidate`), the hourly regeneration only catches a missed call.
 */
export const revalidate = 3600;

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "reviews" });
  return { title: t("title"), description: t("description") };
}

export default async function ReviewsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "reviews" });
  const page = await loadReviews("ReviewsPage", {
    limit: PUBLIC_REVIEWS_MAX_LIMIT,
  });

  return (
    <section className="bg-paper min-h-[60vh]">
      <div className="mx-auto max-w-3xl px-4 pt-16 pb-24 md:px-8 md:pt-24 md:pb-32">
        <Link
          href="/shop"
          className="hover:text-moss mb-8 inline-block text-[0.7rem] tracking-[0.25em] text-stone-400 uppercase transition-colors"
        >
          ← {t("back")}
        </Link>
        <h1 className="font-serif text-3xl font-light tracking-[0.12em] text-stone-800 md:text-4xl">
          {t("title")}
        </h1>

        {page.averageRating !== null && (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <ReviewStars
              rating={Math.round(page.averageRating)}
              label={t("stars", { rating: page.averageRating })}
              className="h-5 w-5"
            />
            <span className="text-stone-800">
              {t("average", { average: page.averageRating })}
            </span>
            <span className="text-sm text-stone-500">
              {t("count", { count: page.total })}
            </span>
          </div>
        )}

        <p className="mt-6 max-w-2xl text-sm leading-relaxed text-stone-600">
          {t("source")}
        </p>

        {page.data.length === 0 ? (
          <p className="mt-12 text-stone-500">{t("empty")}</p>
        ) : (
          <div className="mt-12 space-y-5">
            {page.data.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
