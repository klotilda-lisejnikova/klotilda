"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Seconds to wait once it scrolls into view. */
  delay?: number;
  direction?: "up" | "left" | "right" | "none";
  className?: string;
};

/**
 * Hides an element that is off screen and shows it again the first time it scrolls into view.
 * Returns the cleanup, or nothing when the element is already on screen and stays as it is.
 */
function hideUntilInView(el: HTMLElement): (() => void) | undefined {
  if (typeof IntersectionObserver === "undefined") return;
  const box = el.getBoundingClientRect();
  if (box.top < window.innerHeight && box.bottom > 0) return;

  el.dataset.reveal = "hidden";
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry?.isIntersecting) return;
      el.dataset.reveal = "shown";
      observer.disconnect();
    },
    { rootMargin: "0px 0px -80px 0px" },
  );
  observer.observe(el);
  return () => observer.disconnect();
}

/**
 * Fades its content in the first time it scrolls into view. The server renders it visible and
 * only content still off screen once the page is running gets hidden, so nothing waits for
 * JavaScript: what is on screen at the first paint stays there. The look is `.fade-in` in
 * globals.css.
 */
export default function FadeIn({
  children,
  delay = 0,
  direction = "up",
  className,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    return el ? hideUntilInView(el) : undefined;
  }, []);

  return (
    <div
      ref={ref}
      data-direction={direction}
      className={className ? `fade-in ${className}` : "fade-in"}
      style={{ "--fade-delay": `${delay}s` } as CSSProperties}
    >
      {children}
    </div>
  );
}
