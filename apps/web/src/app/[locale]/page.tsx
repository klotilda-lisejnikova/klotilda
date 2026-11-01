import { setRequestLocale } from "next-intl/server";
import HeroSection from "@/components/home/HeroSection";
import AboutSection from "@/components/home/AboutSection";
import GallerySection from "@/components/home/GallerySection";
import CtaSection from "@/components/home/CtaSection";
import ContactSection from "@/components/home/ContactSection";
import ReviewsSection from "@/components/home/ReviewsSection";
import { listGallery } from "@/services";
import { SHOP_ENABLED } from "@/lib/features";
import { loadOptionalReviews } from "@/lib/reviews";
import { loadStaticData } from "@/lib/static-data";

/** The home page's strip: the newest few. */
const HOME_REVIEWS = 3;

// Regenerate the landing page (incl. the gallery) at most every 10 minutes.
export const revalidate = 600;

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [galleryItems, reviews] = await Promise.all([
    loadStaticData("HomePage", listGallery, []),
    SHOP_ENABLED
      ? loadOptionalReviews("HomePage", { limit: HOME_REVIEWS })
      : Promise.resolve(null),
  ]);

  return (
    <>
      <HeroSection />
      <AboutSection />
      <GallerySection items={galleryItems} />
      <CtaSection />
      {reviews && <ReviewsSection page={reviews} />}
      <ContactSection />
    </>
  );
}
