"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { mediaUrl } from "@/lib/media-url";
import Image from "next/image";
import { motion } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";
import { getGalleryTranslations } from "@/i18n/home";
import FadeIn from "@/components/ui/FadeIn";
import Lightbox, { type LightboxSlide } from "@/components/ui/Lightbox";
import { scrollBehavior } from "@/lib/motion";
import { categoryName } from "@/lib/category";
import type { Locale } from "@/types/locale";
import type { GalleryItem, GalleryRow as GalleryRowNumber } from "@/services";

const ROWS: GalleryRowNumber[] = [1, 2];
const SECTION_BG = "#f5efe6";

/** Above this many photos the phone slider shows "3 / 20" instead of a dot per photo. */
const MAX_DOTS = 12;

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

/** A gallery photo as the cards and the lightbox show it, with its place in the whole gallery. */
interface Artwork {
  item: GalleryItem;
  index: number;
  title: string;
  category: string | null;
}

type Labels = ReturnType<typeof getGalleryTranslations>;

function ArtworkCard({
  artwork,
  sizes,
  onOpen,
  openLabel,
}: {
  artwork: Artwork;
  sizes: string;
  onOpen: (index: number) => void;
  openLabel: string;
}) {
  const { item, title, category } = artwork;

  return (
    <button
      type="button"
      onClick={() => onOpen(artwork.index)}
      aria-label={`${openLabel}: ${title}`}
      className="group focus-visible:outline-moss block w-full cursor-zoom-in overflow-hidden rounded-md text-left focus-visible:outline-2 focus-visible:outline-offset-4"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-stone-200">
        {item.images[0] && (
          <Image
            src={mediaUrl(item.images[0].url)}
            alt={title}
            fill
            className="object-cover"
            sizes={sizes}
          />
        )}
        {category && (
          <div className="absolute top-3 right-3 z-10">
            <span
              className="px-2.5 py-1 text-[0.6rem] tracking-[0.2em] text-[#6b5e50] uppercase"
              style={{ background: "rgba(250,250,248,0.9)" }}
            >
              {category}
            </span>
          </div>
        )}
        {/* The "click to enlarge" cue: a small magnifier that fades in on hover / keyboard focus. */}
        <div
          aria-hidden="true"
          className="absolute right-3 bottom-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#fafaf8]/90 text-stone-600 opacity-0 shadow-sm transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="6.5" />
            <path d="M16 16l4.5 4.5M11 8.5v5M8.5 11h5" />
          </svg>
        </div>
      </div>
      <div
        className="border border-t-0 border-stone-200 px-4 py-3"
        style={{ background: "#fafaf8" }}
      >
        <p className="group-hover:text-moss font-serif text-sm tracking-wide text-stone-700 transition-colors">
          {title}
        </p>
      </div>
    </button>
  );
}

/** Desktop (`md+`): one row of the gallery, a horizontal snap-scroll when it holds more than fit. */
function GalleryRow({
  artworks,
  onOpen,
  labels,
}: {
  artworks: Artwork[];
  onOpen: (index: number) => void;
  labels: Labels;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  // Whether more cards are hidden past the start / end of the scroll row.
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
      behavior: scrollBehavior(),
    });
  };

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        onScroll={updateEdges}
        className="flex snap-x snap-mandatory [scrollbar-width:none] gap-5 overflow-x-auto pb-1 [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {artworks.map((artwork, i) => (
          <motion.div
            key={artwork.item.id}
            className="w-[calc((100%-1.25rem)/2)] shrink-0 snap-start lg:w-[calc((100%-2.5rem)/3)]"
            custom={i}
            variants={cardVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
          >
            <ArtworkCard
              artwork={artwork}
              sizes="(min-width: 1024px) 384px, 50vw"
              onOpen={onOpen}
              openLabel={labels.open}
            />
          </motion.div>
        ))}
      </div>

      {/* Scroll affordance, shown only while there is more in that direction. */}
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
            aria-label={isEnd ? labels.next : labels.previous}
            className={`hover:border-moss hover:text-moss absolute top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-stone-300 bg-[#fafaf8]/90 text-stone-500 shadow-sm transition-[color,border-color,opacity,box-shadow] duration-300 hover:shadow-md ${
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

/**
 * Phones (`< md`): the whole gallery as one horizontal slider — the rows are ignored, so there is
 * a single swipe axis (two separate sideways rows were confusing, 2026-08-31). The next card
 * peeks in from the right; dots (or a counter) show where you are.
 */
function MobileSlider({
  artworks,
  onOpen,
  labels,
}: {
  artworks: Artwork[];
  onOpen: (index: number) => void;
  labels: Labels;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);

  const step = () => {
    const el = scrollRef.current;
    const card = el?.firstElementChild as HTMLElement | null;
    if (!el || !card) return 0;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    return card.offsetWidth + gap;
  };

  const onScroll = () => {
    const el = scrollRef.current;
    const width = step();
    if (!el || !width) return;
    // The last card cannot scroll to the start edge; reaching the end means it is the current one.
    const atEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 1;
    setCurrent(atEnd ? artworks.length - 1 : Math.round(el.scrollLeft / width));
  };

  const goTo = (index: number) => {
    scrollRef.current?.scrollTo({
      left: index * step(),
      behavior: scrollBehavior(),
    });
  };

  return (
    <div>
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="-mx-4 flex snap-x snap-mandatory scroll-px-4 [scrollbar-width:none] gap-3 overflow-x-auto overscroll-x-contain px-4 pb-1 [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {artworks.map((artwork) => (
          <div key={artwork.item.id} className="w-[78%] shrink-0 snap-start">
            <ArtworkCard
              artwork={artwork}
              sizes="80vw"
              onOpen={onOpen}
              openLabel={labels.open}
            />
          </div>
        ))}
      </div>

      {artworks.length > 1 && (
        <div className="mt-6 flex items-center justify-center">
          {artworks.length <= MAX_DOTS ? (
            artworks.map((artwork, i) => (
              <button
                key={artwork.item.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`${i + 1} / ${artworks.length}`}
                aria-current={i === current}
                // The dot is small, the tap target is not.
                className="flex h-8 w-6 items-center justify-center"
              >
                <span
                  className={`block h-1.5 rounded-full transition-all duration-300 ${
                    i === current ? "bg-moss w-5" : "w-1.5 bg-stone-300"
                  }`}
                />
              </button>
            ))
          ) : (
            <p className="text-xs tracking-[0.25em] text-stone-500 tabular-nums">
              {current + 1} / {artworks.length}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function GallerySection({ items }: Props) {
  const t = useTranslations("home");
  const labels = getGalleryTranslations(t);
  const locale = useLocale() as Locale;
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // Row 1, then row 2 — one order for the desktop rows, the phone slider and the lightbox.
  const artworks: Artwork[] = ROWS.flatMap((row) =>
    items.filter((item) => item.row === row),
  ).map((item, index) => ({
    item,
    index,
    title: locale === "en" && item.title_en ? item.title_en : item.title_cs,
    category: item.category ? categoryName(item.category, locale) : null,
  }));

  if (artworks.length === 0) return null;

  const rows = ROWS.map((row) =>
    artworks.filter((artwork) => artwork.item.row === row),
  ).filter((rowArtworks) => rowArtworks.length > 0);

  const slides: LightboxSlide[] = artworks
    .filter((artwork) => artwork.item.images[0])
    .map((artwork) => ({
      id: artwork.item.id,
      src: mediaUrl(artwork.item.images[0].url),
      alt: artwork.title,
      caption: artwork.title,
      label: artwork.category ?? undefined,
    }));

  // A card's index counts every artwork; the lightbox only holds the ones with a photo.
  const openArtwork = (index: number) => {
    const slide = slides.findIndex((s) => s.id === artworks[index]?.item.id);
    if (slide !== -1) setOpenIndex(slide);
  };

  return (
    <section
      id="gallery"
      className="relative z-20 scroll-mt-16 pt-20 pb-24 md:py-36"
      style={{
        background: SECTION_BG,
        marginTop: "-3rem",
        boxShadow: "0 -20px 44px -22px rgba(55, 48, 38, 0.2)",
      }}
    >
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <FadeIn className="mb-10 md:mb-14">
          <h2 className="font-serif text-4xl font-light tracking-[0.15em] text-stone-800 md:text-5xl">
            {labels.title}
          </h2>
          <p className="mt-4 text-xs tracking-widest text-stone-500">
            {labels.subtitle}
          </p>
        </FadeIn>

        <FadeIn className="md:hidden">
          <MobileSlider
            artworks={artworks}
            onOpen={openArtwork}
            labels={labels}
          />
        </FadeIn>

        <div className="hidden flex-col gap-5 md:flex">
          {rows.map((rowArtworks, rowIndex) => (
            <GalleryRow
              key={rowIndex}
              artworks={rowArtworks}
              onOpen={openArtwork}
              labels={labels}
            />
          ))}
        </div>
      </div>

      <Lightbox
        slides={slides}
        index={openIndex}
        onClose={() => setOpenIndex(null)}
      />
    </section>
  );
}
