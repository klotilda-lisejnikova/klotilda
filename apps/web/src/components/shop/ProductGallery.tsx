"use client";

import Image from "next/image";
import { mediaUrl } from "@/lib/media-url";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { ProductImage } from "@/services";
import Lightbox, { type LightboxSlide } from "@/components/ui/Lightbox";

interface Props {
  images: ProductImage[];
  alt: string;
}

export default function ProductGallery({ images, alt }: Props) {
  const tGallery = useTranslations("home.gallery");
  const [activeIndex, setActiveIndex] = useState(0);
  const [failed, setFailed] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const visible = images.filter((img) => !failed.has(img.id));
  const active = visible[activeIndex] ?? visible[0];

  useEffect(() => {
    setLoaded(false);
  }, [active?.id]);

  if (!active) {
    return <div className="aspect-[3/4] w-full rounded-md bg-stone-100" />;
  }

  const markFailed = (id: string) =>
    setFailed((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

  const slides: LightboxSlide[] = visible.map((img) => ({
    id: img.id,
    src: mediaUrl(img.url),
    alt,
  }));

  return (
    <>
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setLightboxIndex(visible.indexOf(active))}
          aria-label={`${tGallery("open")}: ${alt}`}
          className="group focus-visible:outline-moss relative aspect-[3/4] w-full cursor-zoom-in overflow-hidden rounded-md bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          {!loaded && (
            <div className="absolute inset-0 animate-pulse bg-stone-200" />
          )}
          <Image
            key={active.id}
            src={mediaUrl(active.url)}
            alt={alt}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className={`object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
            priority
            onLoad={() => setLoaded(true)}
            onError={() => {
              markFailed(active.id);
              setActiveIndex(0);
            }}
          />
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
        </button>

        {visible.length > 1 && (
          <div className="flex gap-2">
            {visible.map((img, i) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setActiveIndex(i)}
                aria-label={`${i + 1} / ${visible.length}`}
                aria-current={active.id === img.id}
                className={`relative h-20 w-[3.75rem] shrink-0 overflow-hidden rounded-sm bg-stone-100 transition-opacity ${
                  active.id === img.id
                    ? "ring-2 ring-moss ring-offset-2 ring-offset-[#fafaf8]"
                    : "opacity-60 hover:opacity-80"
                }`}
              >
                <Image
                  src={mediaUrl(img.url)}
                  alt=""
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      <Lightbox
        slides={slides}
        index={lightboxIndex}
        onClose={(lastIndex) => {
          // Leave the photo the visitor swiped to as the main one.
          setActiveIndex(lastIndex);
          setLightboxIndex(null);
        }}
      />
    </>
  );
}
