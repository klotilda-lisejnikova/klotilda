import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { listAllProducts } from "@/services";
import { loadStaticData } from "@/lib/static-data";
import FadeIn from "@/components/ui/FadeIn";
import ShopCatalog, { CatalogView } from "@/components/shop/ShopCatalog";

/**
 * Static, regenerated at most every minute. Stock shown here may be that old; the cart and the
 * product page check it live, and the checkout decides.
 */
export const revalidate = 60;

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
  const products = await loadStaticData("ShopPage", listAllProducts, []);

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
            <CatalogView products={products} active="all" locale={locale} />
          }
        >
          <ShopCatalog products={products} locale={locale} />
        </Suspense>
      </div>
    </section>
  );
}
