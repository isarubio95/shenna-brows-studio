import { splitHeadlineByAccent } from "@/lib/collection-headline-content";

export interface HeroConfig {
  desktopImageUrl: string;
  mobileImageUrl: string;
  /** Primera línea del H1. */
  line1: string;
  /** Segunda línea completa del H1. */
  line2: string;
  /** Fragmento de line2 en itálica. */
  line2Accent: string;
  headlineColor: string;
  headlineAccentColor: string;
  ctaText: string;
  ctaHref: string;
  ctaBg: string;
  ctaTextColor: string;
  alt: string;
  /** Posición del bloque de texto en escritorio (0–100 %). */
  textPosX: number;
  textPosY: number;
  /** Posición del bloque de texto en móvil (0–100 %). */
  textPosMobileX: number;
  textPosMobileY: number;
}

/** Contenido actual del hero (assets en /public/hero). */
export const DEFAULT_HERO: HeroConfig = {
  desktopImageUrl: "/hero/hero-lg.jpg",
  mobileImageUrl: "/hero/hero-sm.jpg",
  line1: "La precisión",
  line2: "Que te define",
  line2Accent: "define",
  headlineColor: "#F7F0E2",
  headlineAccentColor: "#F7F0E2",
  ctaText: "DESCUBRIR LA COLECCIÓN",
  ctaHref: "/tienda",
  ctaBg: "#F7F2E6",
  ctaTextColor: "#8F7F5D",
  alt: "Shenna Brows",
  textPosX: 5,
  textPosY: 42,
  textPosMobileX: 5,
  textPosMobileY: 42,
};

const isHexColor = (value: unknown): value is string =>
  typeof value === "string" &&
  /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(value.trim());

const asString = (value: unknown, fallback: string) =>
  typeof value === "string" ? value : fallback;

const clampPos = (n: number, min: number, max: number) =>
  Math.round(Math.min(max, Math.max(min, n)) * 10) / 10;

export function clampHeroTextPos(x: number, y: number): { x: number; y: number } {
  return {
    x: clampPos(x, 0, 72),
    y: clampPos(y, 0, 78),
  };
}

const parsePos = (value: unknown, fallback: number) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return clampPos(value, 0, 100);
};

export function parseHeroConfig(raw?: string | null): HeroConfig {
  if (!raw?.trim()) {
    return { ...DEFAULT_HERO };
  }

  const trimmed = raw.trim();
  if (!trimmed.startsWith("{")) {
    return { ...DEFAULT_HERO };
  }

  try {
    const parsed = JSON.parse(trimmed) as Partial<HeroConfig>;
    const desktopPos = clampHeroTextPos(
      parsePos(parsed.textPosX, DEFAULT_HERO.textPosX),
      parsePos(parsed.textPosY, DEFAULT_HERO.textPosY),
    );
    // Si aún no hay posición móvil guardada, hereda la de escritorio.
    const mobilePos = clampHeroTextPos(
      parsePos(parsed.textPosMobileX, desktopPos.x),
      parsePos(parsed.textPosMobileY, desktopPos.y),
    );
    return {
      desktopImageUrl:
        asString(parsed.desktopImageUrl, DEFAULT_HERO.desktopImageUrl).trim() ||
        DEFAULT_HERO.desktopImageUrl,
      mobileImageUrl: asString(
        parsed.mobileImageUrl,
        DEFAULT_HERO.mobileImageUrl,
      ).trim(),
      line1: asString(parsed.line1, DEFAULT_HERO.line1).trim() || DEFAULT_HERO.line1,
      line2: asString(parsed.line2, DEFAULT_HERO.line2).trim() || DEFAULT_HERO.line2,
      line2Accent: asString(parsed.line2Accent, DEFAULT_HERO.line2Accent).trim(),
      headlineColor: isHexColor(parsed.headlineColor)
        ? parsed.headlineColor.trim()
        : DEFAULT_HERO.headlineColor,
      headlineAccentColor: isHexColor(parsed.headlineAccentColor)
        ? parsed.headlineAccentColor.trim()
        : DEFAULT_HERO.headlineAccentColor,
      ctaText: asString(parsed.ctaText, DEFAULT_HERO.ctaText).trim() || DEFAULT_HERO.ctaText,
      ctaHref: asString(parsed.ctaHref, DEFAULT_HERO.ctaHref).trim() || DEFAULT_HERO.ctaHref,
      ctaBg: isHexColor(parsed.ctaBg) ? parsed.ctaBg.trim() : DEFAULT_HERO.ctaBg,
      ctaTextColor: isHexColor(parsed.ctaTextColor)
        ? parsed.ctaTextColor.trim()
        : DEFAULT_HERO.ctaTextColor,
      alt: asString(parsed.alt, DEFAULT_HERO.alt).trim() || DEFAULT_HERO.alt,
      textPosX: desktopPos.x,
      textPosY: desktopPos.y,
      textPosMobileX: mobilePos.x,
      textPosMobileY: mobilePos.y,
    };
  } catch {
    return { ...DEFAULT_HERO };
  }
}

export function serializeHeroConfig(config: HeroConfig): string {
  const desktopPos = clampHeroTextPos(config.textPosX, config.textPosY);
  const mobilePos = clampHeroTextPos(config.textPosMobileX, config.textPosMobileY);
  return JSON.stringify({
    desktopImageUrl: config.desktopImageUrl,
    mobileImageUrl: config.mobileImageUrl,
    line1: config.line1,
    line2: config.line2,
    line2Accent: config.line2Accent,
    headlineColor: config.headlineColor,
    headlineAccentColor: config.headlineAccentColor,
    ctaText: config.ctaText,
    ctaHref: config.ctaHref,
    ctaBg: config.ctaBg,
    ctaTextColor: config.ctaTextColor,
    alt: config.alt,
    textPosX: desktopPos.x,
    textPosY: desktopPos.y,
    textPosMobileX: mobilePos.x,
    textPosMobileY: mobilePos.y,
  });
}
