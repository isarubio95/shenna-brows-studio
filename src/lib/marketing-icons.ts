/**
 * Iconos que el panel deja elegir en los bloques de marketing (franja de
 * confianza, valores de marca…). El dibujo de cada uno está en `MarketingIcon`.
 */
export const MARKETING_ICON_IDS = [
  "truck",
  "package-check",
  "shield-check",
  "message-circle",
  "crosshair",
  "heart",
  "leaf",
  "sparkle",
  "sparkles",
  "star",
  "award",
  "clock",
  "gift",
  "badge-check",
  "credit-card",
  "lock",
  "gem",
  "droplet",
] as const;

export type MarketingIconId = (typeof MARKETING_ICON_IDS)[number];

export const MARKETING_ICON_LABELS: Record<MarketingIconId, string> = {
  truck: "Camión",
  "package-check": "Caja con check",
  "shield-check": "Escudo con check",
  "message-circle": "Bocadillo",
  crosshair: "Diana",
  heart: "Corazón",
  leaf: "Hoja",
  sparkle: "Destello",
  sparkles: "Destellos",
  star: "Estrella",
  award: "Premio",
  clock: "Reloj",
  gift: "Regalo",
  "badge-check": "Verificado",
  "credit-card": "Tarjeta",
  lock: "Candado",
  gem: "Joya",
  droplet: "Gota",
};

export const isMarketingIconId = (value: unknown): value is MarketingIconId =>
  typeof value === "string" && (MARKETING_ICON_IDS as readonly string[]).includes(value);

export const marketingIcon = (value: unknown, fallback: MarketingIconId): MarketingIconId =>
  isMarketingIconId(value) ? value : fallback;
