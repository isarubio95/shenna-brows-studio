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
  alt: string;
  /** Posición del bloque de texto en escritorio (0–100 %). */
  textPosX: number;
  textPosY: number;
  /** Posición del bloque de texto en móvil (0–100 %). */
  textPosMobileX: number;
  textPosMobileY: number;
}

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
  alt: "Campaña publicitaria",
  textPosX: 6,
  textPosY: 32,
  textPosMobileX: 6,
  textPosMobileY: 32,
};

const isHexColor = (value: unknown): value is string =>
  typeof value === "string" &&
  /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(value.trim());

const asString = (value: unknown, fallback: string) =>
  typeof value === "string" ? value : fallback;

const clampPos = (n: number, min: number, max: number) =>
  Math.round(Math.min(max, Math.max(min, n)) * 10) / 10;

export function clampCampaignTextPos(x: number, y: number): { x: number; y: number } {
  return {
    x: clampPos(x, 0, 72),
    y: clampPos(y, 0, 78),
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
    const desktopPos = clampCampaignTextPos(
      parsePos(parsed.textPosX, DEFAULT_CAMPAIGN.textPosX),
      parsePos(parsed.textPosY, DEFAULT_CAMPAIGN.textPosY),
    );
    // Si aún no hay posición móvil guardada, hereda la de escritorio.
    const mobilePos = clampCampaignTextPos(
      parsePos(parsed.textPosMobileX, desktopPos.x),
      parsePos(parsed.textPosMobileY, desktopPos.y),
    );
    const fromSlug = asString(parsed.ctaProductSlug, "").trim().replace(/^\/+|\/+$/g, "");
    const ctaProductSlug = fromSlug || slugFromLegacyHref(parsed.ctaHref);
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
      alt: asString(parsed.alt, DEFAULT_CAMPAIGN.alt).trim() || DEFAULT_CAMPAIGN.alt,
      textPosX: desktopPos.x,
      textPosY: desktopPos.y,
      textPosMobileX: mobilePos.x,
      textPosMobileY: mobilePos.y,
    };
  } catch {
    return { ...DEFAULT_CAMPAIGN };
  }
}

export function serializeCampaignConfig(config: CampaignConfig): string {
  const desktopPos = clampCampaignTextPos(config.textPosX, config.textPosY);
  const mobilePos = clampCampaignTextPos(config.textPosMobileX, config.textPosMobileY);
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
    alt: config.alt,
    textPosX: desktopPos.x,
    textPosY: desktopPos.y,
    textPosMobileX: mobilePos.x,
    textPosMobileY: mobilePos.y,
  });
}
