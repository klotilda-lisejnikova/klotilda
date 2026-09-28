import { Suspense } from "react";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { listAllProducts } from "@/services";
import { loadStaticData } from "@/lib/static-data";
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

async function ShopHero({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "shop" });

  return (
    <div className="relative mb-12 flex h-64 items-center justify-center overflow-hidden rounded-sm sm:h-80">
      {/* Background image — same as landing hero */}
      <Image
        src="/images/bg_hero.jpg"
        alt=""
        aria-hidden="true"
        fill
        priority
        sizes="(min-width: 1152px) 1088px, 100vw"
        className="scale-105 object-cover"
        style={{ filter: "blur(2px)" }}
      />

      {/* Green colour overlay — matches landing page */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: "rgba(80, 100, 70, 0.25)" }}
      />

      {/* Text */}
      <div className="relative z-10 flex flex-col items-center text-center">
        <h1
          className="font-serif text-5xl font-light tracking-[0.18em] uppercase sm:text-6xl"
          style={{
            color: "#ffffff",
            textShadow:
              "0 2px 6px rgba(0,0,0,0.25), 0 12px 48px rgba(0,0,0,0.35)",
          }}
        >
          {t("title")}
        </h1>

        <div className="mt-5 flex items-center gap-5">
          <div
            className="h-px w-16"
            style={{ background: "rgba(255,255,255,0.45)" }}
          />
          <p
            className="text-xs font-light tracking-[0.35em] uppercase"
            style={{
              color: "#ffffff",
              textShadow: "0 1px 10px rgba(0,0,0,0.5)",
            }}
          >
            {t("heroSubtitle")}
          </p>
          <div
            className="h-px w-16"
            style={{ background: "rgba(255,255,255,0.45)" }}
          />
        </div>
      </div>
    </div>
  );
}

export default async function ShopPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const products = await loadStaticData("ShopPage", listAllProducts, []);

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <ShopHero locale={locale} />

      {/* The static HTML holds every product; the browser then applies ?category= itself. */}
      <Suspense
        fallback={
          <CatalogView products={products} active="all" locale={locale} />
        }
      >
        <ShopCatalog products={products} locale={locale} />
      </Suspense>
    </section>
  );
}
