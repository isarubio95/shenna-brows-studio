export const TIENDA_HERO_ICON_IDS = [
  "shield-check",
  "truck",
  "sparkles",
  "package",
  "star",
  "clock",
  "heart",
  "award",
  "badge-check",
  "zap",
] as const;

export type TiendaHeroIconId = (typeof TIENDA_HERO_ICON_IDS)[number];

export const TIENDA_HERO_ICON_LABELS: Record<TiendaHeroIconId, string> = {
  "shield-check": "Escudo",
  truck: "Envío",
  sparkles: "Destellos",
  package: "Paquete",
  star: "Estrella",
  clock: "Reloj",
  heart: "Corazón",
  award: "Premio",
  "badge-check": "Verificado",
  zap: "Rayo",
};

export interface TiendaHeroFeature {
  icon: TiendaHeroIconId;
  label: string;
}

export interface TiendaHeroConfig {
  desktopImageUrl: string;
  mobileImageUrl: string;
  eyebrow: string;
  headline: string;
  description: string;
  features: TiendaHeroFeature[];
  ctaText: string;
  /** Ancla (#productos), ruta interna (/packs) o URL absoluta. */
  ctaHref: string;
  accentColor: string;
  headlineColor: string;
  descriptionColor: string;
  featureColor: string;
  ctaBg: string;
  ctaTextColor: string;
  alt: string;
  /** Intensidad del overlay claro sobre la imagen (0–100). */
  overlayStrength: number;
  /** Posición del bloque de contenido en escritorio (0–100 %). */
  contentPosX: number;
  contentPosY: number;
  /** Posición del bloque de contenido en móvil (0–100 %). */
  contentPosMobileX: number;
  contentPosMobileY: number;
}

export const TIENDA_HERO_IMAGE_PATH = "/tienda/tienda-hero.jpg";
export const TIENDA_HERO_MOBILE_IMAGE_PATH = "/tienda/tienda-hero-mobile.jpg";
export const TIENDA_HERO_ASPECT = 1600 / 961;
export const TIENDA_HERO_MOBILE_ASPECT = 9 / 16;

/** Subidas antiguas recortadas a 21:9 / 4:5 perdían el degradé blanco inferior. */
const isLegacyTiendaHeroCrop = (url: string) =>
  url.includes("/campaign-images/tienda-hero-");

export function resolveTiendaHeroImageUrl(
  url: string | undefined | null,
  variant: "desktop" | "mobile" = "desktop",
): string {
  const fallback =
    variant === "mobile" ? TIENDA_HERO_MOBILE_IMAGE_PATH : TIENDA_HERO_IMAGE_PATH;
  const trimmed = (url ?? "").trim();
  if (!trimmed || isLegacyTiendaHeroCrop(trimmed)) {
    return fallback;
  }
  return trimmed;
}

export const DEFAULT_TIENDA_HERO: TiendaHeroConfig = {
  desktopImageUrl: TIENDA_HERO_IMAGE_PATH,
  mobileImageUrl: TIENDA_HERO_MOBILE_IMAGE_PATH,
  eyebrow: "Tienda oficial",
  headline: "Herramientas y productos premium para unas cejas impecables",
  description:
    "Descubre la colección profesional de Shenna Brows. Productos diseñados para ofrecer precisión, control y resultados perfectos en cada aplicación.",
  features: [
    { icon: "shield-check", label: "Calidad profesional" },
    { icon: "truck", label: "Envío rápido 24/72h" },
    { icon: "sparkles", label: "Resultados de precisión" },
  ],
  ctaText: "Comprar ahora",
  ctaHref: "#productos",
  accentColor: "#C5A059",
  headlineColor: "#1A1A1A",
  descriptionColor: "#1A1A1AB3",
  featureColor: "#1A1A1AB3",
  ctaBg: "#C5A059",
  ctaTextColor: "#FFFFFF",
  alt: "Cabecera de la tienda Shenna Brows",
  overlayStrength: 0,
  contentPosX: 50,
  contentPosY: 52,
  contentPosMobileX: 50,
  contentPosMobileY: 46,
};

const HEX_RE = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;

const isHexColor = (value: unknown): value is string =>
  typeof value === "string" && HEX_RE.test(value.trim());

const asString = (value: unknown, fallback: string) =>
  typeof value === "string" ? value : fallback;

const isIconId = (value: unknown): value is TiendaHeroIconId =>
  typeof value === "string" &&
  (TIENDA_HERO_ICON_IDS as readonly string[]).includes(value);

const MAX_FEATURES = 4;

const clampPos = (n: number, min: number, max: number) =>
  Math.round(Math.min(max, Math.max(min, n)) * 10) / 10;

export function clampTiendaHeroContentPos(x: number, y: number): { x: number; y: number } {
  return {
    x: clampPos(x, 20, 80),
    y: clampPos(y, 35, 75),
  };
}

const parsePos = (value: unknown, fallback: number) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return clampPos(value, 0, 100);
};

const parseOverlayStrength = (value: unknown, fallback: number) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.round(Math.min(100, Math.max(0, value)));
};

const parseFeatures = (raw: unknown): TiendaHeroFeature[] => {
  if (!Array.isArray(raw)) {
    return DEFAULT_TIENDA_HERO.features.map((f) => ({ ...f }));
  }

  const parsed = raw
    .slice(0, MAX_FEATURES)
    .map((item, index): TiendaHeroFeature | null => {
      if (!item || typeof item !== "object") return null;
      const row = item as Partial<TiendaHeroFeature>;
      const fallback = DEFAULT_TIENDA_HERO.features[index] ?? DEFAULT_TIENDA_HERO.features[0];
      const label = asString(row.label, fallback.label).trim();
      if (!label) return null;
      return {
        icon: isIconId(row.icon) ? row.icon : fallback.icon,
        label,
      };
    })
    .filter((item): item is TiendaHeroFeature => item !== null);

  return parsed;
};

export function parseTiendaHeroConfig(raw?: string | null): TiendaHeroConfig {
  if (!raw?.trim()) {
    return {
      ...DEFAULT_TIENDA_HERO,
      features: DEFAULT_TIENDA_HERO.features.map((f) => ({ ...f })),
    };
  }

  const trimmed = raw.trim();
  if (!trimmed.startsWith("{")) {
    return {
      ...DEFAULT_TIENDA_HERO,
      features: DEFAULT_TIENDA_HERO.features.map((f) => ({ ...f })),
    };
  }

  try {
    const parsed = JSON.parse(trimmed) as Partial<TiendaHeroConfig>;
    const desktopPos = clampTiendaHeroContentPos(
      parsePos(parsed.contentPosX, DEFAULT_TIENDA_HERO.contentPosX),
      parsePos(parsed.contentPosY, DEFAULT_TIENDA_HERO.contentPosY),
    );
    const mobilePos = clampTiendaHeroContentPos(
      parsePos(parsed.contentPosMobileX, desktopPos.x),
      parsePos(parsed.contentPosMobileY, desktopPos.y),
    );
    return {
      desktopImageUrl: resolveTiendaHeroImageUrl(parsed.desktopImageUrl, "desktop"),
      mobileImageUrl: resolveTiendaHeroImageUrl(
        asString(parsed.mobileImageUrl, parsed.desktopImageUrl ?? "").trim() ||
          parsed.desktopImageUrl,
        "mobile",
      ),
      eyebrow:
        asString(parsed.eyebrow, DEFAULT_TIENDA_HERO.eyebrow).trim() ||
        DEFAULT_TIENDA_HERO.eyebrow,
      headline:
        asString(parsed.headline, DEFAULT_TIENDA_HERO.headline).trim() ||
        DEFAULT_TIENDA_HERO.headline,
      description:
        asString(parsed.description, DEFAULT_TIENDA_HERO.description).trim() ||
        DEFAULT_TIENDA_HERO.description,
      features: parseFeatures(parsed.features),
      ctaText:
        asString(parsed.ctaText, DEFAULT_TIENDA_HERO.ctaText).trim() || DEFAULT_TIENDA_HERO.ctaText,
      ctaHref:
        asString(parsed.ctaHref, DEFAULT_TIENDA_HERO.ctaHref).trim() || DEFAULT_TIENDA_HERO.ctaHref,
      accentColor: isHexColor(parsed.accentColor)
        ? parsed.accentColor.trim()
        : DEFAULT_TIENDA_HERO.accentColor,
      headlineColor: isHexColor(parsed.headlineColor)
        ? parsed.headlineColor.trim()
        : DEFAULT_TIENDA_HERO.headlineColor,
      descriptionColor: isHexColor(parsed.descriptionColor)
        ? parsed.descriptionColor.trim()
        : DEFAULT_TIENDA_HERO.descriptionColor,
      featureColor: isHexColor(parsed.featureColor)
        ? parsed.featureColor.trim()
        : DEFAULT_TIENDA_HERO.featureColor,
      ctaBg: isHexColor(parsed.ctaBg) ? parsed.ctaBg.trim() : DEFAULT_TIENDA_HERO.ctaBg,
      ctaTextColor: isHexColor(parsed.ctaTextColor)
        ? parsed.ctaTextColor.trim()
        : DEFAULT_TIENDA_HERO.ctaTextColor,
      alt: asString(parsed.alt, DEFAULT_TIENDA_HERO.alt).trim() || DEFAULT_TIENDA_HERO.alt,
      overlayStrength: parseOverlayStrength(parsed.overlayStrength, DEFAULT_TIENDA_HERO.overlayStrength),
      contentPosX: desktopPos.x,
      contentPosY: desktopPos.y,
      contentPosMobileX: mobilePos.x,
      contentPosMobileY: mobilePos.y,
    };
  } catch {
    return {
      ...DEFAULT_TIENDA_HERO,
      features: DEFAULT_TIENDA_HERO.features.map((f) => ({ ...f })),
    };
  }
}

export function serializeTiendaHeroConfig(config: TiendaHeroConfig): string {
  const desktopPos = clampTiendaHeroContentPos(config.contentPosX, config.contentPosY);
  const mobilePos = clampTiendaHeroContentPos(config.contentPosMobileX, config.contentPosMobileY);
  return JSON.stringify({
    desktopImageUrl: config.desktopImageUrl.trim(),
    mobileImageUrl: config.mobileImageUrl.trim(),
    eyebrow: config.eyebrow.trim() || DEFAULT_TIENDA_HERO.eyebrow,
    headline: config.headline.trim() || DEFAULT_TIENDA_HERO.headline,
    description: config.description.trim() || DEFAULT_TIENDA_HERO.description,
    features: config.features
      .map((f) => ({
        icon: isIconId(f.icon) ? f.icon : DEFAULT_TIENDA_HERO.features[0].icon,
        label: f.label.trim(),
      }))
      .filter((f) => f.label.length > 0)
      .slice(0, MAX_FEATURES),
    ctaText: config.ctaText.trim() || DEFAULT_TIENDA_HERO.ctaText,
    ctaHref: config.ctaHref.trim() || DEFAULT_TIENDA_HERO.ctaHref,
    accentColor: config.accentColor,
    headlineColor: config.headlineColor,
    descriptionColor: config.descriptionColor,
    featureColor: config.featureColor,
    ctaBg: config.ctaBg,
    ctaTextColor: config.ctaTextColor,
    alt: config.alt.trim() || DEFAULT_TIENDA_HERO.alt,
    overlayStrength: parseOverlayStrength(config.overlayStrength, DEFAULT_TIENDA_HERO.overlayStrength),
    contentPosX: desktopPos.x,
    contentPosY: desktopPos.y,
    contentPosMobileX: mobilePos.x,
    contentPosMobileY: mobilePos.y,
  });
}

export function resolveTiendaHeroImageSrc(
  config: Pick<TiendaHeroConfig, "desktopImageUrl" | "mobileImageUrl">,
  device: "desktop" | "mobile",
): string {
  const raw =
    device === "mobile"
      ? config.mobileImageUrl.trim() || config.desktopImageUrl.trim()
      : config.desktopImageUrl.trim() || config.mobileImageUrl.trim();
  return raw || TIENDA_HERO_IMAGE_PATH;
}

export function tiendaHeroCtaHref(config: Pick<TiendaHeroConfig, "ctaHref">): string {
  return config.ctaHref.trim() || DEFAULT_TIENDA_HERO.ctaHref;
}

export function isTiendaHeroInternalPath(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//");
}

/** Convierte #RGB / #RRGGBB / #RRGGBBAA a rgba() para el halo del banner. */
export function hexToRgba(hex: string, alpha: number): string {
  const raw = hex.trim().replace(/^#/, "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => `${c}${c}`)
          .join("")
      : raw.slice(0, 6);
  const n = Number.parseInt(full, 16);
  if (!Number.isFinite(n)) return `rgba(197,160,89,${alpha})`;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}
