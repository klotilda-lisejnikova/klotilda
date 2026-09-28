import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { listProducts, Product, ProductCategory } from "@/services";
import CategoryFilter from "@/components/shop/CategoryFilter";
import ProductCard from "@/components/shop/ProductCard";

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string; page?: string }>;
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/bg_hero.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full scale-105 object-cover"
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
          <div className="h-px w-16" style={{ background: "rgba(255,255,255,0.45)" }} />
          <p
            className="text-xs font-light tracking-[0.35em] uppercase"
            style={{
              color: "#ffffff",
              textShadow: "0 1px 10px rgba(0,0,0,0.5)",
            }}
          >
            {t("heroSubtitle")}
          </p>
          <div className="h-px w-16" style={{ background: "rgba(255,255,255,0.45)" }} />
        </div>
      </div>
    </div>
  );
}

async function ProductList({
  locale,
  category,
  page,
}: {
  locale: string;
  category?: ProductCategory;
  page?: string;
}) {
  const t = await getTranslations({ locale, namespace: "shop" });

  let products: Product[] = [];
  try {
    const result = await listProducts({
      category,
      page: page ? Number(page) : 1,
      limit: 24,
    });
    products = result.data;
  } catch (err) {
    console.error("[ProductList] Failed to fetch products:", err);
  }

  if (products.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-stone-400">{t("empty")}</p>
    );
  }

  return (
    <>
      {/* Results row */}
      <div className="mb-7 flex items-center gap-4">
        <span className="shrink-0 text-[11px] tracking-[0.22em] tabular-nums text-stone-400 uppercase">
          {t("productsCount", { count: products.length })}
        </span>
        <div className="h-px flex-1 bg-stone-100" />
      </div>

      <div className="grid grid-cols-2 gap-6 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} locale={locale} />
        ))}
      </div>
    </>
  );
}

function ProductListSkeleton() {
  return (
    <>
      {/* Results row skeleton */}
      <div className="mb-7 flex items-center gap-4">
        <div className="h-3 w-20 animate-pulse rounded bg-stone-100" />
        <div className="h-px flex-1 bg-stone-100" />
      </div>

      <div className="grid grid-cols-2 gap-6 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i}>
            <div className="aspect-square animate-pulse rounded bg-stone-200" />
            <div className="mt-3 flex items-start justify-between gap-2">
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-3/4 animate-pulse rounded bg-stone-200" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-stone-100" />
              </div>
              <div className="h-4 w-14 animate-pulse rounded bg-stone-200" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export default async function ShopPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { category, page } = await searchParams;

  const validCategories: ProductCategory[] = ["keramika", "vysivka", "linoryt"];
  const activeCategory = validCategories.includes(category as ProductCategory)
    ? (category as ProductCategory)
    : undefined;

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <ShopHero locale={locale} />

      <Suspense>
        <CategoryFilter />
      </Suspense>

      <div className="mt-10">
        <Suspense
          key={`${activeCategory ?? "all"}-${page ?? "1"}`}
          fallback={<ProductListSkeleton />}
        >
          <ProductList locale={locale} category={activeCategory} page={page} />
        </Suspense>
      </div>
    </section>
  );
}
