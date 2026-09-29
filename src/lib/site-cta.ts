import type { CSSProperties } from "react";
import { DEFAULT_HERO } from "@/lib/hero-content";

/**
 * Misma pieza que el CTA del hero: rectangular, sólido, mayúsculas y tracking amplio.
 * Los colores salen del hero para que el resto de botones siga ese estilo.
 */
export const SITE_CTA_CLASS =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none border border-solid font-sans text-[0.65rem] font-normal uppercase tracking-[0.22em] px-6 py-3 sm:px-7 h-auto shadow-none transition-all duration-300 active:scale-95";

export function siteCtaStyle(
  background = DEFAULT_HERO.ctaBg,
  color = DEFAULT_HERO.ctaTextColor,
): CSSProperties {
  return {
    backgroundColor: background,
    borderColor: background,
    color,
  };
}
