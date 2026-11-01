import { useTranslations } from "next-intl";
import type { PublicReviewsPage } from "@klotilda/domain";
import { Link } from "@/i18n/navigation";
import ReviewStars from "./ReviewStars";

/** The shop's average and count, linking its reviews; nothing until one is published. */
export default function ReviewsSummary({ page }: { page: PublicReviewsPage }) {
  const t = useTranslations("reviews");
  if (page.averageRating === null) return null;

  return (
    <Link
      href="/shop/recenze"
      className="group mt-5 inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-600"
    >
      <ReviewStars
        rating={Math.round(page.averageRating)}
        label={t("stars", { rating: page.averageRating })}
      />
      <span>
        {t("average", { average: page.averageRating })} ·{" "}
        {t("count", { count: page.total })}
      </span>
      <span className="group-hover:text-moss underline underline-offset-4 transition-colors">
        {t("shopLink")}
      </span>
    </Link>
  );
}
