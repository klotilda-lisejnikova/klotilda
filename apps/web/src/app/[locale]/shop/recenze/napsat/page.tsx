import { getTranslations, setRequestLocale } from "next-intl/server";
import ReviewForm from "@/components/reviews/ReviewForm";

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string | string[] }>;
}

/** A personal page reached from an e-mail: never indexed, never cached. */
export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "reviews.write" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function WriteReviewPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { token } = await searchParams;
  const t = await getTranslations({ locale, namespace: "reviews.write" });

  return (
    <section className="bg-paper min-h-[60vh]">
      <div className="mx-auto max-w-2xl px-4 pt-16 pb-24 md:px-8 md:pt-24 md:pb-32">
        <h1 className="font-serif text-3xl font-light tracking-[0.12em] text-stone-800 md:text-4xl">
          {t("title")}
        </h1>
        <ReviewForm token={typeof token === "string" ? token : ""} />
      </div>
    </section>
  );
}
