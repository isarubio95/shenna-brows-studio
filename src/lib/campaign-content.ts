export interface CampaignConfig {
  desktopImageUrl: string;
  mobileImageUrl: string;
  headline: string;
  headlineColor: string;
  subheadline: string;
  subheadlineAccent: string;
  subheadlineColor: string;
  subheadlineAccentColor: string;
  dividerColor: string;
  alt: string;
  /** Posición horizontal del bloque de texto (0–100 %, desde la izquierda). */
  textPosX: number;
  /** Posición vertical del bloque de texto (0–100 %, desde arriba). */
  textPosY: number;
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
  alt: "Campaña publicitaria",
  textPosX: 6,
  textPosY: 32,
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

export function parseCampaignConfig(raw?: string | null): CampaignConfig {
  if (!raw?.trim()) {
    return { ...DEFAULT_CAMPAIGN };
  }

  const trimmed = raw.trim();
  if (!trimmed.startsWith("{")) {
    return { ...DEFAULT_CAMPAIGN };
  }

  try {
    const parsed = JSON.parse(trimmed) as Partial<CampaignConfig>;
    const pos = clampCampaignTextPos(
      parsePos(parsed.textPosX, DEFAULT_CAMPAIGN.textPosX),
      parsePos(parsed.textPosY, DEFAULT_CAMPAIGN.textPosY),
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
      alt: asString(parsed.alt, DEFAULT_CAMPAIGN.alt).trim() || DEFAULT_CAMPAIGN.alt,
      textPosX: pos.x,
      textPosY: pos.y,
    };
  } catch {
    return { ...DEFAULT_CAMPAIGN };
  }
}

export function serializeCampaignConfig(config: CampaignConfig): string {
  const pos = clampCampaignTextPos(config.textPosX, config.textPosY);
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
    alt: config.alt,
    textPosX: pos.x,
    textPosY: pos.y,
  });
}
