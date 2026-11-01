import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { listAllProducts } from "@/services";
import { loadStaticData } from "@/lib/static-data";
import { loadOptionalReviews } from "@/lib/reviews";
import ShopReviews from "@/components/reviews/ShopReviews";
import FadeIn from "@/components/ui/FadeIn";
import ShopCatalog, { CatalogView } from "@/components/shop/ShopCatalog";
import { ALL_CATEGORIES } from "@/components/shop/CategoryFilter";

/**
 * Static. The API has it rebuilt whenever the catalogue or the stock changes
 * (`/api/revalidate`); the hourly regeneration only catches a missed call. The cart and the
 * product page check the stock live, and the checkout decides.
 */
export const revalidate = 3600;

/** The newest reviews shown at the end of the page; the rest are on `/shop/recenze`. */
const SHOP_PAGE_REVIEWS = 3;

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "shop" });
  return { title: t("title"), description: t("description") };
}

export default async function ShopPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "shop" });
  const [products, reviews] = await Promise.all([
    loadStaticData("ShopPage", listAllProducts, []),
    loadOptionalReviews("ShopPage", { limit: SHOP_PAGE_REVIEWS }),
  ]);

  return (
    // The paper background and the heading of the home page's gallery.
    <section className="bg-paper">
      <div className="mx-auto max-w-6xl px-4 pt-16 pb-24 md:px-8 md:pt-24 md:pb-32">
        <FadeIn className="mb-10 md:mb-14">
          <h1 className="font-serif text-4xl font-light tracking-[0.15em] text-stone-800 md:text-5xl">
            {t("title")}
          </h1>
          <p className="mt-4 text-xs tracking-widest text-stone-500">
            {t("description")}
          </p>
        </FadeIn>

        {/* The static HTML holds every product; the browser then applies ?category= itself. */}
        <Suspense
          fallback={
            <CatalogView
              products={products}
              active={ALL_CATEGORIES}
              locale={locale}
            />
          }
        >
          <ShopCatalog products={products} locale={locale} />
        </Suspense>

        <ShopReviews page={reviews} />
      </div>
    </section>
  );
}
