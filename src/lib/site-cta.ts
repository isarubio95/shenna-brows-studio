import type { CSSProperties } from "react";
import { DEFAULT_HERO } from "@/lib/hero-content";
import { cn } from "@/lib/utils";

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

export type SiteCtaSize = "sm" | "md" | "lg";

export const SITE_CTA_SIZES: SiteCtaSize[] = ["sm", "md", "lg"];

export const SITE_CTA_SIZE_LABELS: Record<SiteCtaSize, string> = {
  sm: "Pequeño",
  md: "Mediano",
  lg: "Grande",
};

/** "md" es el botón de siempre; los otros dos ajustan relleno y letra. */
const SITE_CTA_SIZE_CLASS: Record<SiteCtaSize, string> = {
  sm: "px-4 py-2 text-[0.58rem] tracking-[0.18em] sm:px-5",
  md: "",
  lg: "px-8 py-4 text-xs sm:px-10",
};

export function isSiteCtaSize(value: unknown): value is SiteCtaSize {
  return value === "sm" || value === "md" || value === "lg";
}

export function siteCtaClass(size: SiteCtaSize = "md", className?: string): string {
  return cn(SITE_CTA_CLASS, SITE_CTA_SIZE_CLASS[size] ?? "", className);
}
