/** Mismo rosa que el CTA de la campaña publicitaria (`DEFAULT_CAMPAIGN.ctaBg`). */
export const SALE_BADGE_PINK = "#E9808E";

export interface BadgeAppearance {
  text: string;
  background: string;
  textColor: string;
}

export interface SiteBadgesConfig {
  sale: BadgeAppearance;
}

export const DEFAULT_SALE_BADGE: BadgeAppearance = {
  text: "Oferta",
  background: SALE_BADGE_PINK,
  textColor: "#FFFFFF",
};

export const DEFAULT_SITE_BADGES: SiteBadgesConfig = {
  sale: { ...DEFAULT_SALE_BADGE },
};

const HEX_RE = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;

const isHexColor = (value: unknown): value is string =>
  typeof value === "string" && HEX_RE.test(value.trim());

const asString = (value: unknown, fallback: string) =>
  typeof value === "string" ? value : fallback;

const parseAppearance = (raw: unknown, fallback: BadgeAppearance): BadgeAppearance => {
  if (!raw || typeof raw !== "object") return { ...fallback };
  const row = raw as Partial<BadgeAppearance>;
  return {
    text: asString(row.text, fallback.text).trim() || fallback.text,
    background: isHexColor(row.background) ? row.background.trim() : fallback.background,
    textColor: isHexColor(row.textColor) ? row.textColor.trim() : fallback.textColor,
  };
};

export function parseSiteBadgesConfig(raw?: string | null): SiteBadgesConfig {
  if (!raw?.trim()) {
    return { sale: { ...DEFAULT_SALE_BADGE } };
  }

  const trimmed = raw.trim();
  if (!trimmed.startsWith("{")) {
    return { sale: { ...DEFAULT_SALE_BADGE } };
  }

  try {
    const parsed = JSON.parse(trimmed) as Partial<SiteBadgesConfig> & Partial<BadgeAppearance>;
    const saleSource = parsed.sale ?? parsed;
    return {
      sale: parseAppearance(saleSource, DEFAULT_SALE_BADGE),
    };
  } catch {
    return { sale: { ...DEFAULT_SALE_BADGE } };
  }
}

export function serializeSiteBadgesConfig(config: SiteBadgesConfig): string {
  return JSON.stringify({
    sale: {
      text: config.sale.text.trim() || DEFAULT_SALE_BADGE.text,
      background: config.sale.background,
      textColor: config.sale.textColor,
    },
  });
}
