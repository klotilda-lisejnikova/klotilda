"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/**
 * framer-motion animations (the fade-ins on scroll, the gallery cards) follow the visitor's
 * "reduce motion" system setting: movement is dropped, fades stay.
 */
export default function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
