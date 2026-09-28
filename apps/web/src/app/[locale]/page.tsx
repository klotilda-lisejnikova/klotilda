import { setRequestLocale } from "next-intl/server";
import HeroSection from "@/components/home/HeroSection";
import AboutSection from "@/components/home/AboutSection";
import GallerySection from "@/components/home/GallerySection";
import CtaSection from "@/components/home/CtaSection";
import ContactSection from "@/components/home/ContactSection";
import { listGallery } from "@/services";
import { loadStaticData } from "@/lib/static-data";

// Regenerate the landing page (incl. the gallery) at most every 10 minutes.
export const revalidate = 600;

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const galleryItems = await loadStaticData("HomePage", listGallery, []);

  return (
    <>
      <HeroSection />
      <AboutSection />
      <GallerySection items={galleryItems} />
      <CtaSection />
      <ContactSection />
    </>
  );
}
