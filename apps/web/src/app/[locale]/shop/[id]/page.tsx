import { cache } from "react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getProduct, type Product } from "@/services";
import AddToCartButton from "@/components/shop/AddToCartButton";
import ProductGallery from "@/components/shop/ProductGallery";

export const dynamic = "force-dynamic";

/**
 * One API call per request for the metadata and the page. A missing product 404s here, in the
 * metadata, so the status is still 404 before the page streams.
 */
const loadProduct = cache(async (id: string): Promise<Product> => {
  try {
    return await getProduct(id);
  } catch {
    notFound();
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
  const t = await getTranslations({ locale, namespace: "shop" });

  const product = await loadProduct(id);

  const name =
    locale === "en" && product.name_en ? product.name_en : product.name_cs;
  const description =
    locale === "en" && product.description_en
      ? product.description_en
      : product.description_cs;
  const inStock = product.stockCount > 0;

  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Back */}
      <Link
        href="/shop"
        className="mb-10 inline-flex items-center gap-1.5 text-xs tracking-wide text-stone-400 uppercase transition-colors hover:text-stone-700"
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
          {/* Category chip */}
          <span className="mb-3 self-start rounded-full border border-stone-200 px-3 py-0.5 text-xs tracking-wider text-stone-500 uppercase">
            {t(`filters.${product.category}`)}
          </span>

          {/* Name */}
          <h1 className="text-2xl leading-snug font-light tracking-wide text-stone-800 sm:text-3xl">
            {name}
          </h1>

          {/* Price */}
          <p className="mt-4 text-3xl font-light text-stone-800 tabular-nums">
            {product.price.toLocaleString("cs-CZ")}&nbsp;
            <span className="text-xl text-stone-500">{t("currency")}</span>
          </p>

          <div className="my-6 h-px bg-stone-100" />

          {/* Stock status */}
          <div className="mb-6">
            {inStock ? (
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 items-center justify-center">
                  <span className="absolute h-2 w-2 animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="text-sm text-emerald-700">
                  {t("inStock")}
                  <span className="ml-1.5 text-emerald-500/80">
                    · {t("pieces", { count: product.stockCount })}
                  </span>
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-rose-400" />
                <span className="text-sm text-rose-600">{t("soldOut")}</span>
              </div>
            )}
          </div>

          {/* Description */}
          {description && (
            <p className="mb-8 text-sm leading-relaxed text-stone-500">
              {description}
            </p>
          )}

          <div className="mt-auto">
            <AddToCartButton product={product} />
          </div>
        </div>
      </div>
    </section>
  );
}
