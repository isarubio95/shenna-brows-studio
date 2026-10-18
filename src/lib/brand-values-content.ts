import { marketingIcon, type MarketingIconId } from "@/lib/marketing-icons";

export const BRAND_VALUES_CONTENT_KEY = "site_brand_values";

export const BRAND_VALUES_MAX_CARDS = 4;

export interface BrandValueCard {
  icon: MarketingIconId;
  title: string;
  text: string;
  /** Foto de la tarjeta; vacío = tarjeta sin foto. */
  imageUrl: string;
  /** Vacío = foto decorativa. */
  imageAlt: string;
}

export interface BrandValuesConfig {
  /** Muestra u oculta el bloque en toda la web. */
  enabled: boolean;
  eyebrow: string;
  title: string;
  /** Fragmento del título que se resalta en cursiva y color de acento. */
  titleAccent: string;
  /** Palabras clave bajo el título (se muestran en mayúsculas). */
  keywords: string;
  cards: BrandValueCard[];
}

/**
 * Textos de la maqueta «La esencia que define Shenna BROWS». Las fotos son
 * recortes de esa maqueta: se pueden cambiar desde el panel por otras en alta.
 */
export const DEFAULT_BRAND_VALUES: BrandValuesConfig = {
  enabled: true,
  eyebrow: "Nuestros valores",
  title: "La esencia que define Shenna BROWS",
  titleAccent: "Shenna BROWS",
  keywords: "Belleza · Precisión · Cuidado · Detalle",
  cards: [
    {
      icon: "crosshair",
      title: "Precisión en cada detalle",
      text: "Herramientas diseñadas para definir, cuidar y realzar tu belleza con la máxima precisión.",
      imageUrl: "/valores/precision.jpg",
      imageAlt: "Pinza de precisión Shenna",
    },
    {
      icon: "heart",
      title: "Tu belleza, a tu manera",
      text: "Resultados que respetan tu estilo y realzan tu expresión natural.",
      imageUrl: "/valores/belleza.jpg",
      imageAlt: "Ceja definida de forma natural",
    },
    {
      icon: "leaf",
      title: "Cuidado que acompaña",
      text: "Fórmulas y rutinas pensadas para el cuidado diario de tus cejas y pestañas.",
      imageUrl: "/valores/cuidado.jpg",
      imageAlt: "Gota de sérum cayendo de un cuentagotas",
    },
    {
      icon: "sparkle",
      title: "El valor de los detalles",
      text: "Una experiencia cuidada de principio a fin, con la calidad y el diseño que nos definen.",
      imageUrl: "/valores/detalles.jpg",
      imageAlt: "Caja de regalo Shenna BROWS",
    },
  ],
};

/** Fotos de serie (recortes de la maqueta, en baja resolución). */
export const BRAND_VALUES_PLACEHOLDER_IMAGES = DEFAULT_BRAND_VALUES.cards.map((card) => card.imageUrl);

const str = (value: unknown) => (typeof value === "string" ? value.trim() : "");

function parseCard(raw: unknown, fallback: BrandValueCard): BrandValueCard | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Partial<Record<keyof BrandValueCard, unknown>>;
  const title = str(row.title);
  if (!title) return null;
  return {
    icon: marketingIcon(row.icon, fallback.icon),
    title,
    text: str(row.text),
    imageUrl: str(row.imageUrl),
    imageAlt: str(row.imageAlt),
  };
}

export function cloneBrandValues(config: BrandValuesConfig): BrandValuesConfig {
  return { ...config, cards: config.cards.map((card) => ({ ...card })) };
}

export function parseBrandValuesConfig(raw?: string | null): BrandValuesConfig {
  const d = DEFAULT_BRAND_VALUES;
  const trimmed = raw?.trim();
  if (!trimmed?.startsWith("{")) return cloneBrandValues(d);

  try {
    const parsed = JSON.parse(trimmed) as Partial<Record<keyof BrandValuesConfig, unknown>>;
    const cards = Array.isArray(parsed.cards)
      ? parsed.cards
          .slice(0, BRAND_VALUES_MAX_CARDS)
          .map((card, i) => parseCard(card, d.cards[i] ?? d.cards[0]))
          .filter((card): card is BrandValueCard => card !== null)
      : [];
    return {
      enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : d.enabled,
      eyebrow: typeof parsed.eyebrow === "string" ? parsed.eyebrow.trim() : d.eyebrow,
      title: str(parsed.title) || d.title,
      titleAccent: typeof parsed.titleAccent === "string" ? parsed.titleAccent.trim() : d.titleAccent,
      keywords: typeof parsed.keywords === "string" ? parsed.keywords.trim() : d.keywords,
      cards: cards.length > 0 ? cards : cloneBrandValues(d).cards,
    };
  } catch {
    return cloneBrandValues(d);
  }
}

export function serializeBrandValuesConfig(config: BrandValuesConfig): string {
  return JSON.stringify({
    enabled: config.enabled,
    eyebrow: config.eyebrow.trim(),
    title: config.title.trim(),
    titleAccent: config.titleAccent.trim(),
    keywords: config.keywords.trim(),
    cards: config.cards.slice(0, BRAND_VALUES_MAX_CARDS).map((card) => ({
      icon: card.icon,
      title: card.title.trim(),
      text: card.text.trim(),
      imageUrl: card.imageUrl.trim(),
      imageAlt: card.imageAlt.trim(),
    })),
  });
}
