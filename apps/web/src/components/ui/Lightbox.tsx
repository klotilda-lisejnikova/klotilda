"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { scrollBehavior } from "@/lib/motion";

export interface LightboxSlide {
  id: string;
  src: string;
  alt: string;
  caption?: string;
  label?: string;
}

interface Props {
  slides: LightboxSlide[];
  /** The slide to show; `null` keeps the lightbox closed. */
  index: number | null;
  /** Called with the slide the visitor ended on, so an opener can follow along. */
  onClose: (lastIndex: number) => void;
}

/** Slides this far from the current one get their photo; the rest wait until they come near. */
const PRELOAD_DISTANCE = 1;

/**
 * Whether a click on an `object-contain` photo hit the picture itself rather than the empty
 * letterbox around it — a click beside the photo closes the lightbox like a click on the backdrop.
 */
function isOnPicture(img: HTMLImageElement, x: number, y: number): boolean {
  const box = img.getBoundingClientRect();
  if (!img.naturalWidth || !img.naturalHeight) return true;
  const scale = Math.min(
    box.width / img.naturalWidth,
    box.height / img.naturalHeight,
  );
  const width = img.naturalWidth * scale;
  const height = img.naturalHeight * scale;
  const left = box.left + (box.width - width) / 2;
  const top = box.top + (box.height - height) / 2;
  return x >= left && x <= left + width && y >= top && y <= top + height;
}

/**
 * Full-screen photo viewer on a native `<dialog>` (focus trap, Esc and the top layer come from the
 * browser). Slides sit in a horizontal snap strip, so a phone swipes between them natively;
 * arrow keys and the side buttons move by one.
 */
export default function Lightbox({ slides, index, onClose }: Props) {
  const t = useTranslations("lightbox");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(index ?? 0);

  const goTo = useCallback((target: number, smooth = true) => {
    const strip = stripRef.current;
    if (!strip) return;
    strip.scrollTo({
      left: target * strip.clientWidth,
      behavior: smooth ? scrollBehavior() : "instant",
    });
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (index === null) {
      if (dialog.open) dialog.close();
      return;
    }
    setCurrent(index);
    if (!dialog.open) dialog.showModal();
    goTo(index, false);

    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previousOverflow;
    };
  }, [index, goTo]);

  const onScroll = () => {
    const strip = stripRef.current;
    if (!strip || !strip.clientWidth) return;
    setCurrent(Math.round(strip.scrollLeft / strip.clientWidth));
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowRight")
      goTo(Math.min(slides.length - 1, current + 1));
    if (event.key === "ArrowLeft") goTo(Math.max(0, current - 1));
  };

  const onSlideClick = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    if (target instanceof HTMLImageElement) {
      if (isOnPicture(target, event.clientX, event.clientY)) return;
    } else if (target.closest("figcaption")) {
      return;
    }
    dialogRef.current?.close();
  };

  const arrowClass =
    "absolute top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 text-white/70 transition-[color,border-color,opacity] hover:border-white/60 hover:text-white disabled:pointer-events-none disabled:opacity-0 md:flex";

  return (
    <dialog
      ref={dialogRef}
      onClose={() => onClose(current)}
      onKeyDown={onKeyDown}
      aria-label={slides[current]?.caption ?? slides[current]?.alt}
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none overflow-hidden border-0 bg-[#12150f] p-0 text-white backdrop:bg-transparent"
    >
      <div
        ref={stripRef}
        onScroll={onScroll}
        className="flex h-full snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto overscroll-contain [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((slide, i) => (
          <figure
            key={slide.id}
            onClick={onSlideClick}
            className="flex h-full w-full shrink-0 snap-center flex-col items-center justify-center gap-4 px-4 pt-16 pb-6 md:px-24 md:pb-10"
          >
            <div className="relative w-full flex-1">
              {Math.abs(i - current) <= PRELOAD_DISTANCE && (
                <Image
                  src={slide.src}
                  alt={slide.alt}
                  fill
                  className="object-contain"
                  sizes="100vw"
                  quality={85}
                />
              )}
            </div>
            {(slide.caption || slide.label) && (
              <figcaption className="text-center">
                {slide.caption && (
                  <p className="font-serif tracking-wide text-white/90">
                    {slide.caption}
                  </p>
                )}
                {slide.label && (
                  <p className="mt-1 text-[0.6rem] tracking-[0.25em] text-white/50 uppercase">
                    {slide.label}
                  </p>
                )}
              </figcaption>
            )}
          </figure>
        ))}
      </div>

      {slides.length > 1 && (
        <p className="absolute top-5 left-5 text-xs tracking-[0.25em] text-white/60 tabular-nums">
          {current + 1} / {slides.length}
        </p>
      )}

      <button
        type="button"
        onClick={() => dialogRef.current?.close()}
        aria-label={t("close")}
        className="absolute top-3 right-3 flex h-11 w-11 items-center justify-center rounded-full text-white/70 transition-colors hover:text-white"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      {slides.length > 1 &&
        (["previous", "next"] as const).map((direction) => {
          const isNext = direction === "next";
          return (
            <button
              key={direction}
              type="button"
              onClick={() => goTo(current + (isNext ? 1 : -1))}
              disabled={isNext ? current >= slides.length - 1 : current <= 0}
              aria-label={t(direction)}
              className={`${arrowClass} ${isNext ? "right-6" : "left-6"}`}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={isNext ? "M9 6l6 6-6 6" : "M15 6l-6 6 6 6"} />
              </svg>
            </button>
          );
        })}
    </dialog>
  );
}
