import { emptyTextFonts, parseTextFonts, serializeTextFonts, type TextFonts } from "@/lib/fonts";
import { TESTIMONIALS_PAGE_PATH } from "@/lib/testimonials";

export const TESTIMONIALS_BANNER_CONTENT_KEY = "index_testimonials";

/** Textos del bloque con fuente elegible en el panel. */
export const TESTIMONIALS_BANNER_FONT_SLOTS = ["title", "subtitle", "cta"] as const;
export type TestimonialsBannerFontSlot = (typeof TESTIMONIALS_BANNER_FONT_SLOTS)[number];

export interface TestimonialsBannerConfig {
  /** Muestra u oculta la sección en la home. */
  enabled: boolean;
  /** Foto de escritorio (horizontal, 1552×563). */
  desktopImageUrl: string;
  /** Foto de móvil (vertical, 900×1600). */
  mobileImageUrl: string;
  /** Vacío = foto decorativa. */
  alt: string;
  title: string;
  titleColor: string;
  subtitle: string;
  subtitleColor: string;
  dividerColor: string;
  ctaText: string;
  ctaHref: string;
  /** Tamaño de los textos respecto al de diseño, en % (100 = igual). */
  textScale: number;
  /** Bloque de texto en escritorio: borde izquierdo, centro vertical y ancho (0–100 %). */
  textPosX: number;
  textPosY: number;
  textWidth: number;
  /** Bloque de texto en móvil (0–100 %). */
  textPosMobileX: number;
  textPosMobileY: number;
  textWidthMobile: number;
  /** Fuente propia de cada texto; "" hereda la del tema. */
  fonts: TextFonts<TestimonialsBannerFontSlot>;
}

export const TEXT_SCALE_MIN = 60;
export const TEXT_SCALE_MAX = 160;
export const TEXT_WIDTH_MIN = 10;

/** Contenido original de la sección (fotos en /public/testimonios). */
export const DEFAULT_TESTIMONIALS_BANNER: TestimonialsBannerConfig = {
  enabled: true,
  desktopImageUrl: "/testimonios/resultados-escritorio.jpg",
  mobileImageUrl: "/testimonios/resultados-movil.jpg",
  alt: "",
  title: "Resultados reales",
  titleColor: "#6A4E3F",
  subtitle: "Una comunidad que confía en Shenna Brows.",
  subtitleColor: "#6A4E3F",
  dividerColor: "#B9826A",
  ctaText: "Ver opiniones",
  ctaHref: TESTIMONIALS_PAGE_PATH,
  textScale: 100,
  // Las fotos dejan hueco entre la cara y las miniaturas (escritorio) y abajo
  // a la izquierda (móvil).
  textPosX: 62,
  textPosY: 50,
  textWidth: 18.5,
  textPosMobileX: 6,
  textPosMobileY: 74,
  textWidthMobile: 59,
  fonts: { ...emptyTextFonts(TESTIMONIALS_BANNER_FONT_SLOTS), title: "poppins", subtitle: "poppins" },
};

const isHexColor = (value: unknown): value is string =>
  typeof value === "string" &&
  /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(value.trim());

const text = (value: unknown, fallback: string) =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;

const color = (value: unknown, fallback: string) =>
  isHexColor(value) ? value.trim() : fallback;

const clamp = (n: number, min: number, max: number) =>
  Math.round(Math.min(max, Math.max(min, n)) * 10) / 10;

const num = (value: unknown, fallback: number, min: number, max: number) =>
  typeof value === "number" && Number.isFinite(value) ? clamp(value, min, max) : fallback;

export const clampTextScale = (n: number) => clamp(n, TEXT_SCALE_MIN, TEXT_SCALE_MAX);

/** Normaliza posición y ancho para que el bloque nunca se salga de la foto. */
export function clampTextBox(x: number, y: number, width: number) {
  const w = clamp(width, TEXT_WIDTH_MIN, 100);
  return { x: clamp(x, 0, 100 - w), y: clamp(y, 0, 100), width: w };
}

function normalize(config: TestimonialsBannerConfig): TestimonialsBannerConfig {
  const desktop = clampTextBox(config.textPosX, config.textPosY, config.textWidth);
  const mobile = clampTextBox(
    config.textPosMobileX,
    config.textPosMobileY,
    config.textWidthMobile,
  );
  return {
    ...config,
    textScale: clampTextScale(config.textScale),
    textPosX: desktop.x,
    textPosY: desktop.y,
    textWidth: desktop.width,
    textPosMobileX: mobile.x,
    textPosMobileY: mobile.y,
    textWidthMobile: mobile.width,
  };
}

export function parseTestimonialsBannerConfig(raw?: string | null): TestimonialsBannerConfig {
  const trimmed = raw?.trim();
  if (!trimmed?.startsWith("{")) return { ...DEFAULT_TESTIMONIALS_BANNER };

  try {
    const parsed = JSON.parse(trimmed) as Partial<Record<keyof TestimonialsBannerConfig, unknown>>;
    const d = DEFAULT_TESTIMONIALS_BANNER;
    return normalize({
      enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : d.enabled,
      desktopImageUrl: text(parsed.desktopImageUrl, d.desktopImageUrl),
      mobileImageUrl: text(parsed.mobileImageUrl, d.mobileImageUrl),
      alt: typeof parsed.alt === "string" ? parsed.alt.trim() : d.alt,
      title: text(parsed.title, d.title),
      titleColor: color(parsed.titleColor, d.titleColor),
      subtitle: typeof parsed.subtitle === "string" ? parsed.subtitle.trim() : d.subtitle,
      subtitleColor: color(parsed.subtitleColor, d.subtitleColor),
      dividerColor: color(parsed.dividerColor, d.dividerColor),
      ctaText: text(parsed.ctaText, d.ctaText),
      ctaHref: text(parsed.ctaHref, d.ctaHref),
      textScale: num(parsed.textScale, d.textScale, TEXT_SCALE_MIN, TEXT_SCALE_MAX),
      textPosX: num(parsed.textPosX, d.textPosX, 0, 100),
      textPosY: num(parsed.textPosY, d.textPosY, 0, 100),
      textWidth: num(parsed.textWidth, d.textWidth, TEXT_WIDTH_MIN, 100),
      textPosMobileX: num(parsed.textPosMobileX, d.textPosMobileX, 0, 100),
      textPosMobileY: num(parsed.textPosMobileY, d.textPosMobileY, 0, 100),
      textWidthMobile: num(parsed.textWidthMobile, d.textWidthMobile, TEXT_WIDTH_MIN, 100),
      fonts: parseTextFonts(parsed.fonts, TESTIMONIALS_BANNER_FONT_SLOTS),
    });
  } catch {
    return { ...DEFAULT_TESTIMONIALS_BANNER };
  }
}

export function serializeTestimonialsBannerConfig(config: TestimonialsBannerConfig): string {
  const c = normalize(config);
  return JSON.stringify({
    enabled: c.enabled,
    desktopImageUrl: c.desktopImageUrl,
    mobileImageUrl: c.mobileImageUrl,
    alt: c.alt,
    title: c.title,
    titleColor: c.titleColor,
    subtitle: c.subtitle,
    subtitleColor: c.subtitleColor,
    dividerColor: c.dividerColor,
    ctaText: c.ctaText,
    ctaHref: c.ctaHref,
    textScale: c.textScale,
    textPosX: c.textPosX,
    textPosY: c.textPosY,
    textWidth: c.textWidth,
    textPosMobileX: c.textPosMobileX,
    textPosMobileY: c.textPosMobileY,
    textWidthMobile: c.textWidthMobile,
    fonts: serializeTextFonts(c.fonts),
  });
}

/** Las fotos de serie tienen versión WebP al lado; las subidas ya son WebP. */
export function bundledWebpFor(src: string): string | null {
  return src.startsWith("/testimonios/") && src.endsWith(".jpg")
    ? src.replace(/\.jpg$/, ".webp")
    : null;
}
