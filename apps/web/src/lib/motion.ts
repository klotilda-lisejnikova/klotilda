/**
 * How a scripted scroll (slider arrows, dots, the lightbox) moves: smoothly, unless the visitor
 * asked the system for reduced motion.
 */
export function scrollBehavior(): ScrollBehavior {
  return typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "instant"
    : "smooth";
}
