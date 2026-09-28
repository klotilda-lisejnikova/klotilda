import { cache } from "react";
import { notFound } from "next/navigation";
import { ApiError } from "@eleansphere/entity-core";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getProduct, listAllProducts, type Product } from "@/services";
import { loadStaticData } from "@/lib/static-data";
import ProductGallery from "@/components/shop/ProductGallery";
import ProductPurchase from "@/components/shop/ProductPurchase";

/**
 * Rendered on the first visit, then served from the cache and regenerated at most every minute.
 * Price and stock are looked up again in the browser (`ProductPurchase`).
 */
export const revalidate = 60;

/**
 * Every product on offer is rendered at build time. That matters for Czech: its URLs carry no
 * prefix and reach the page through the next-intl rewrite, and a page first rendered behind a
 * rewrite was served uncached by `next start`. Products added later render on their first visit.
 */
export async function generateStaticParams() {
  const products = await loadStaticData("ProductPage", listAllProducts, []);
  return products.map((product) => ({ id: product.id }));
}

/**
 * One API call per render for the metadata and the page. A missing product 404s here, in the
 * metadata, so the status is still 404. Any other failure is rethrown: the cache then keeps the
 * last good page instead of storing a 404 for an existing product.
 */
const loadProduct = cache(async (id: string): Promise<Product> => {
  try {
    return await getProduct(id);
  } catch (err) {
    if (err instanceof ApiError && err.isNotFound) notFound();
    throw err;
  }
});

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale, id } = await params;
  const product = await loadProduct(id);
  const name =
    locale === "en" && product.name_en ? product.name_en : product.name_cs;
  return { title: name };
}

export default async function ProductDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "shop" });

  const product = await loadProduct(id);

  const name =
    locale === "en" && product.name_en ? product.name_en : product.name_cs;
  const description =
    locale === "en" && product.description_en
      ? product.description_en
      : product.description_cs;

  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
      {/* Back */}
      <Link
        href="/shop"
        className="hover:text-moss mb-10 inline-flex items-center gap-1.5 text-[0.7rem] tracking-[0.25em] text-stone-400 uppercase transition-colors"
      >
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        {t("title")}
      </Link>

      <div className="grid gap-10 md:grid-cols-2 md:gap-16">
        <ProductGallery images={product.images} alt={name} />

        {/* Info */}
        <div className="flex flex-col">
          {/* Category chip — the craft chips of "O mně" */}
          <span className="mb-5 self-start border border-stone-300 px-3 py-1 text-[0.65rem] tracking-[0.25em] text-stone-500 uppercase">
            {t(`filters.${product.category}`)}
          </span>

          {/* Name — the serif of the home page's headings */}
          <h1 className="font-serif text-3xl leading-snug font-light tracking-[0.06em] text-stone-800 sm:text-4xl">
            {name}
          </h1>

          <ProductPurchase product={product}>
            {description && (
              <p className="mb-10 leading-relaxed text-stone-600">
                {description}
              </p>
            )}
          </ProductPurchase>
        </div>
      </div>
    </section>
  );
}
