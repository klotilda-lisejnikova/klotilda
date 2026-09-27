"use client";

import Image from "next/image";
import { mediaUrl } from "@/lib/media-url";
import { useState, useEffect, useCallback } from "react";
import { ProductImage } from "@/services";

interface Props {
  images: ProductImage[];
  alt: string;
}

export default function ProductGallery({ images, alt }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [failed, setFailed] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const visible = images.filter((img) => !failed.has(img.id));
  const active = visible[activeIndex] ?? visible[0];

  useEffect(() => {
    setLoaded(false);
  }, [active?.id]);

  const closeLightbox = useCallback(() => setLightboxOpen(false), []);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight")
        setActiveIndex((i) => Math.min(visible.length - 1, i + 1));
      if (e.key === "ArrowLeft") setActiveIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxOpen, visible.length, closeLightbox]);

  if (!active) {
    return <div className="aspect-square w-full bg-stone-100" />;
  }

  const markFailed = (id: string) =>
    setFailed((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

  return (
    <>
      <div className="flex flex-col gap-3">
        <div
          className="group relative aspect-square w-full cursor-zoom-in overflow-hidden bg-stone-100"
          onClick={() => setLightboxOpen(true)}
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
          <div className="absolute right-2 bottom-2 rounded-full bg-white/70 p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
            <svg
              className="h-4 w-4 text-stone-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
              />
            </svg>
          </div>
        </div>

        {visible.length > 1 && (
          <div className="flex gap-2">
            {visible.map((img, i) => (
              <button
                key={img.id}
                onClick={() => setActiveIndex(i)}
                className={`relative h-20 w-20 shrink-0 overflow-hidden bg-stone-100 transition-opacity ${
                  active.id === img.id
                    ? "ring-2 ring-stone-800"
                    : "opacity-60 hover:opacity-80"
                }`}
              >
                <Image
                  src={mediaUrl(img.url)}
                  alt={alt}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={closeLightbox}
        >
          <button
            aria-label="Zavřít"
            className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/25"
            onClick={closeLightbox}
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {visible.length > 1 && (
            <>
              <button
                aria-label="Předchozí"
                className="absolute left-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/25 disabled:opacity-30"
                disabled={activeIndex === 0}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveIndex((i) => Math.max(0, i - 1));
                }}
              >
                <svg
                  className="h-6 w-6"
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
              </button>
              <button
                aria-label="Další"
                className="absolute right-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/25 disabled:opacity-30"
                disabled={activeIndex === visible.length - 1}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveIndex((i) => Math.min(visible.length - 1, i + 1));
                }}
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </>
          )}

          <div
            className="relative aspect-square w-[min(90vw,90vh)]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={mediaUrl(active.url)}
              alt={alt}
              fill
              sizes="90vw"
              className="object-contain"
              priority
            />
          </div>

          {visible.length > 1 && (
            <div className="absolute bottom-4 flex gap-2">
              {visible.map((img, i) => (
                <button
                  key={img.id}
                  aria-label={`Obrázek ${i + 1}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveIndex(i);
                  }}
                  className={`h-2 w-2 rounded-full transition-colors ${
                    active.id === img.id ? "bg-white" : "bg-white/40"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
