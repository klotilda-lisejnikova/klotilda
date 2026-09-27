"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { mediaUrl } from "@/lib/media-url";
import Image from "next/image";
import { motion } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";
import { getGalleryTranslations } from "@/i18n/home";
import FadeIn from "@/components/ui/FadeIn";
import type { Locale } from "@/types/locale";
import type { GalleryItem, GalleryRow as GalleryRowNumber } from "@/services";

const ROWS: GalleryRowNumber[] = [1, 2];
const SECTION_BG = "#f5efe6";

// Subtle per-category accent for the badge text (kept from the old hand-curated gallery).
const CATEGORY_ACCENT: Record<string, string> = {
  keramika: "#6b5e50",
  vysivka: "#6e6050",
  linoryt: "#62574e",
};

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
      delay: i * 0.1,
    },
  }),
};

interface Props {
  items: GalleryItem[];
}

function GalleryRow({
  items,
  locale,
  tCat,
}: {
  items: GalleryItem[];
  locale: Locale;
  tCat: ReturnType<typeof useTranslations>;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  // Whether more cards are hidden past the start / end of the (desktop) scroll row.
  const [edges, setEdges] = useState({ start: false, end: false });

  const updateEdges = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setEdges({
      start: max > 1 && el.scrollLeft > 1,
      end: max > 1 && el.scrollLeft < max - 1,
    });
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    updateEdges();
    const raf = requestAnimationFrame(updateEdges);
    // rAF is paused in background tabs; a timer still fires and catches up.
    const timer = setTimeout(updateEdges, 250);

    const observer = new ResizeObserver(updateEdges);
    observer.observe(el);

    const onVisible = () => {
      if (document.visibilityState === "visible") updateEdges();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [updateEdges]);

  const nudge = (direction: 1 | -1) => {
    scrollRef.current?.scrollBy({
      left: direction * scrollRef.current.clientWidth * 0.85,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        onScroll={updateEdges}
        className="flex flex-col gap-5 md:flex-row md:snap-x md:snap-mandatory md:overflow-x-auto md:pb-1 md:[-ms-overflow-style:none] md:[scrollbar-width:none] md:[&::-webkit-scrollbar]:hidden"
      >
        {items.map((item, i) => {
          const title =
            locale === "en" && item.title_en ? item.title_en : item.title_cs;
          const accent =
            (item.category && CATEGORY_ACCENT[item.category]) || "#6b5e50";
          return (
            <motion.article
              key={item.id}
              className="group w-full overflow-hidden rounded-md md:w-[calc((100%-1.25rem)/2)] md:shrink-0 md:snap-start lg:w-[calc((100%-2.5rem)/3)]"
              custom={i}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
            >
              <div className="relative overflow-hidden">
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-stone-200 transition-transform duration-700 group-hover:scale-105">
                  {item.images[0] && (
                    <Image
                      src={mediaUrl(item.images[0].url)}
                      alt={title}
                      fill
                      className="object-cover"
                      sizes="(min-width: 1024px) 384px, (min-width: 768px) 50vw, 100vw"
                    />
                  )}
                  {item.category && CATEGORY_ACCENT[item.category] && (
                    <div className="absolute top-3 right-3 z-10">
                      <span
                        className="px-2.5 py-1 text-[0.6rem] tracking-[0.2em] uppercase"
                        style={{
                          background: "rgba(250,250,248,0.82)",
                          color: accent,
                          backdropFilter: "blur(4px)",
                        }}
                      >
                        {tCat(item.category)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div
                className="border border-t-0 border-stone-200 px-4 py-3"
                style={{ background: "#fafaf8" }}
              >
                <p className="font-serif text-sm tracking-wide text-stone-700">
                  {title}
                </p>
              </div>
            </motion.article>
          );
        })}
      </div>

      {/* Scroll affordance — desktop only, shown only while there is more in that direction. */}
      {(["start", "end"] as const).map((side) => {
        const isEnd = side === "end";
        const visible = edges[side];
        return (
          <button
            key={side}
            type="button"
            onClick={() => nudge(isEnd ? 1 : -1)}
            tabIndex={visible ? 0 : -1}
            aria-hidden={!visible}
            aria-label={isEnd ? "Další práce" : "Předchozí práce"}
            className={`absolute top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-stone-300 bg-[#fafaf8]/90 text-stone-500 shadow-sm backdrop-blur-sm transition-[color,border-color,opacity,box-shadow] duration-300 hover:border-moss hover:text-moss hover:shadow-md md:flex ${
              isEnd ? "right-3" : "left-3"
            } ${visible ? "opacity-100" : "pointer-events-none opacity-0"}`}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={isEnd ? "M9 6l6 6-6 6" : "M15 6l-6 6 6 6"} />
            </svg>
          </button>
        );
      })}
    </div>
  );
}

export default function GallerySection({ items }: Props) {
  const t = useTranslations("home");
  const tCat = useTranslations("home.gallery.categories");
  const gallery = getGalleryTranslations(t);
  const locale = useLocale() as Locale;

  const rows = ROWS.map((row) =>
    items.filter((item) => item.row === row),
  ).filter((rowItems) => rowItems.length > 0);

  if (rows.length === 0) return null;

  return (
    <section
      id="gallery"
      className="relative z-20 scroll-mt-16 py-28 md:py-36"
      style={{
        background: SECTION_BG,
        marginTop: "-3rem",
        boxShadow: "0 -20px 44px -22px rgba(55, 48, 38, 0.2)",
      }}
    >
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <FadeIn className="mb-14">
          <h2 className="font-serif text-4xl font-light tracking-[0.15em] text-stone-800 md:text-5xl">
            {gallery.title}
          </h2>
          <p className="mt-4 text-xs tracking-widest text-stone-500">
            {gallery.subtitle}
          </p>
        </FadeIn>

        <div className="flex flex-col gap-5">
          {rows.map((rowItems, rowIndex) => (
            <GalleryRow
              key={rowIndex}
              items={rowItems}
              locale={locale}
              tCat={tCat}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
