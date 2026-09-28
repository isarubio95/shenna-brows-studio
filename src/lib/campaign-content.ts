import { emptyTextFonts, parseTextFonts, serializeTextFonts, type TextFonts } from "@/lib/fonts";

/** Textos del bloque con fuente elegible en el panel. */
export const CAMPAIGN_FONT_SLOTS = ["headline", "subheadline", "subheadlineAccent", "cta"] as const;
export type CampaignFontSlot = (typeof CAMPAIGN_FONT_SLOTS)[number];

export interface CampaignConfig {
  /** Foto o vídeo de fondo (escritorio). */
  desktopImageUrl: string;
  /** Foto o vídeo de fondo (móvil). */
  mobileImageUrl: string;
  headline: string;
  headlineColor: string;
  subheadline: string;
  subheadlineAccent: string;
  subheadlineColor: string;
  subheadlineAccentColor: string;
  dividerColor: string;
  ctaText: string;
  /** Slug del producto del catálogo al que enlaza el CTA. Vacío → /tienda. */
  ctaProductSlug: string;
  /** Color rosa del botón (mismo default que el popup de bienvenida). */
  ctaBg: string;
  ctaTextColor: string;
  /** Color del borde del botón (admite alfa, p. ej. #FFFFFFB3). */
  ctaBorderColor: string;
  /** Relleno del botón: degradado sobre `ctaBg` o color liso. */
  ctaFill: CampaignCtaFill;
  ctaSize: CampaignCtaSize;
  /** Centro del botón sobre la imagen/vídeo en escritorio (0–100 %). */
  ctaPosX: number;
  ctaPosY: number;
  /** Centro del botón sobre la imagen/vídeo en móvil (0–100 %). */
  ctaPosMobileX: number;
  ctaPosMobileY: number;
  alt: string;
  /** Fuente propia de cada texto; "" hereda la del tema. */
  fonts: TextFonts<CampaignFontSlot>;
}

export type CampaignCtaFill = "gradient" | "solid";
export type CampaignCtaSize = "sm" | "md" | "lg";

export const CAMPAIGN_CTA_SIZES: CampaignCtaSize[] = ["sm", "md", "lg"];

export const DEFAULT_CAMPAIGN: CampaignConfig = {
  desktopImageUrl: "",
  mobileImageUrl: "",
  headline: "MUCHO MÁS QUE UN PROTECTOR SOLAR",
  headlineColor: "#5C4A32",
  subheadline: "La protección que tu piel estaba esperando.",
  subheadlineAccent: "estaba esperando.",
  subheadlineColor: "#5C4A32",
  subheadlineAccentColor: "#C5A059",
  dividerColor: "#C5A059",
  ctaText: "DESCUBRIR",
  ctaProductSlug: "",
  ctaBg: "#E9808E",
  ctaTextColor: "#FFFFFF",
  ctaBorderColor: "#FFFFFFB3",
  ctaFill: "gradient",
  ctaSize: "md",
  ctaPosX: 50,
  ctaPosY: 85,
  ctaPosMobileX: 50,
  ctaPosMobileY: 85,
  alt: "Campaña publicitaria",
  fonts: emptyTextFonts(CAMPAIGN_FONT_SLOTS),
};

const isHexColor = (value: unknown): value is string =>
  typeof value === "string" &&
  /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(value.trim());

const asString = (value: unknown, fallback: string) =>
  typeof value === "string" ? value : fallback;

const clampPos = (n: number, min: number, max: number) =>
  Math.round(Math.min(max, Math.max(min, n)) * 10) / 10;

/** 0–100 %: el banner ancla el botón en proporción, así que nunca se sale. */
export function clampCampaignCtaPos(x: number, y: number): { x: number; y: number } {
  return {
    x: clampPos(x, 0, 100),
    y: clampPos(y, 0, 100),
  };
}

const parsePos = (value: unknown, fallback: number) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return clampPos(value, 0, 100);
};

/** Ruta del CTA: ficha de producto o tienda si no hay slug. */
export function campaignCtaPath(config: Pick<CampaignConfig, "ctaProductSlug">): string {
  const slug = config.ctaProductSlug.trim().replace(/^\/+|\/+$/g, "");
  return slug ? `/${slug}` : "/tienda";
}

/** Migra configs antiguas con `ctaHref` libre a un slug de producto. */
const slugFromLegacyHref = (href: unknown): string => {
  if (typeof href !== "string") return "";
  const trimmed = href.trim();
  if (!trimmed || trimmed === "/" || trimmed === "/tienda" || trimmed === "tienda") return "";
  const match = trimmed.match(/^\/?([a-zA-Z0-9_-]+)\/?$/);
  return match?.[1] ?? "";
};

export function parseCampaignConfig(raw?: string | null): CampaignConfig {
  if (!raw?.trim()) {
    return { ...DEFAULT_CAMPAIGN };
  }

  const trimmed = raw.trim();
  if (!trimmed.startsWith("{")) {
    return { ...DEFAULT_CAMPAIGN };
  }

  try {
    const parsed = JSON.parse(trimmed) as Partial<CampaignConfig> & { ctaHref?: string };
    const fromSlug = asString(parsed.ctaProductSlug, "").trim().replace(/^\/+|\/+$/g, "");
    const ctaProductSlug = fromSlug || slugFromLegacyHref(parsed.ctaHref);
    const desktopPos = clampCampaignCtaPos(
      parsePos(parsed.ctaPosX, DEFAULT_CAMPAIGN.ctaPosX),
      parsePos(parsed.ctaPosY, DEFAULT_CAMPAIGN.ctaPosY),
    );
    // Si aún no hay posición móvil guardada, hereda la de escritorio.
    const mobilePos = clampCampaignCtaPos(
      parsePos(parsed.ctaPosMobileX, desktopPos.x),
      parsePos(parsed.ctaPosMobileY, desktopPos.y),
    );
    return {
      desktopImageUrl: asString(parsed.desktopImageUrl, DEFAULT_CAMPAIGN.desktopImageUrl).trim(),
      mobileImageUrl: asString(parsed.mobileImageUrl, DEFAULT_CAMPAIGN.mobileImageUrl).trim(),
      headline: asString(parsed.headline, DEFAULT_CAMPAIGN.headline).trim() || DEFAULT_CAMPAIGN.headline,
      headlineColor: isHexColor(parsed.headlineColor)
        ? parsed.headlineColor.trim()
        : DEFAULT_CAMPAIGN.headlineColor,
      subheadline:
        asString(parsed.subheadline, DEFAULT_CAMPAIGN.subheadline).trim() ||
        DEFAULT_CAMPAIGN.subheadline,
      subheadlineAccent: asString(
        parsed.subheadlineAccent,
        DEFAULT_CAMPAIGN.subheadlineAccent,
      ).trim(),
      subheadlineColor: isHexColor(parsed.subheadlineColor)
        ? parsed.subheadlineColor.trim()
        : DEFAULT_CAMPAIGN.subheadlineColor,
      subheadlineAccentColor: isHexColor(parsed.subheadlineAccentColor)
        ? parsed.subheadlineAccentColor.trim()
        : DEFAULT_CAMPAIGN.subheadlineAccentColor,
      dividerColor: isHexColor(parsed.dividerColor)
        ? parsed.dividerColor.trim()
        : DEFAULT_CAMPAIGN.dividerColor,
      ctaText:
        asString(parsed.ctaText, DEFAULT_CAMPAIGN.ctaText).trim() || DEFAULT_CAMPAIGN.ctaText,
      ctaProductSlug,
      ctaBg: isHexColor(parsed.ctaBg) ? parsed.ctaBg.trim() : DEFAULT_CAMPAIGN.ctaBg,
      ctaTextColor: isHexColor(parsed.ctaTextColor)
        ? parsed.ctaTextColor.trim()
        : DEFAULT_CAMPAIGN.ctaTextColor,
      ctaBorderColor: isHexColor(parsed.ctaBorderColor)
        ? parsed.ctaBorderColor.trim()
        : DEFAULT_CAMPAIGN.ctaBorderColor,
      ctaFill: parsed.ctaFill === "solid" ? "solid" : "gradient",
      ctaSize: CAMPAIGN_CTA_SIZES.includes(parsed.ctaSize as CampaignCtaSize)
        ? (parsed.ctaSize as CampaignCtaSize)
        : DEFAULT_CAMPAIGN.ctaSize,
      ctaPosX: desktopPos.x,
      ctaPosY: desktopPos.y,
      ctaPosMobileX: mobilePos.x,
      ctaPosMobileY: mobilePos.y,
      alt: asString(parsed.alt, DEFAULT_CAMPAIGN.alt).trim() || DEFAULT_CAMPAIGN.alt,
      fonts: parseTextFonts(parsed.fonts, CAMPAIGN_FONT_SLOTS),
    };
  } catch {
    return { ...DEFAULT_CAMPAIGN };
  }
}

export function serializeCampaignConfig(config: CampaignConfig): string {
  const desktopPos = clampCampaignCtaPos(config.ctaPosX, config.ctaPosY);
  const mobilePos = clampCampaignCtaPos(config.ctaPosMobileX, config.ctaPosMobileY);
  return JSON.stringify({
    desktopImageUrl: config.desktopImageUrl,
    mobileImageUrl: config.mobileImageUrl,
    headline: config.headline,
    headlineColor: config.headlineColor,
    subheadline: config.subheadline,
    subheadlineAccent: config.subheadlineAccent,
    subheadlineColor: config.subheadlineColor,
    subheadlineAccentColor: config.subheadlineAccentColor,
    dividerColor: config.dividerColor,
    ctaText: config.ctaText,
    ctaProductSlug: config.ctaProductSlug.trim().replace(/^\/+|\/+$/g, ""),
    ctaBg: config.ctaBg,
    ctaTextColor: config.ctaTextColor,
    ctaBorderColor: config.ctaBorderColor,
    ctaFill: config.ctaFill,
    ctaSize: config.ctaSize,
    ctaPosX: desktopPos.x,
    ctaPosY: desktopPos.y,
    ctaPosMobileX: mobilePos.x,
    ctaPosMobileY: mobilePos.y,
    alt: config.alt,
    fonts: serializeTextFonts(config.fonts),
  });
}
