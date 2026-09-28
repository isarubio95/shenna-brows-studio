import { emptyTextFonts, parseTextFonts, serializeTextFonts, type TextFonts } from "@/lib/fonts";

/** Textos del bloque con fuente elegible en el panel. */
export const COLLECTION_HEADLINE_FONT_SLOTS = ["text", "accent"] as const;
export type CollectionHeadlineFontSlot = (typeof COLLECTION_HEADLINE_FONT_SLOTS)[number];

export interface CollectionHeadlineConfig {
  /** Texto completo del titular. */
  text: string;
  /** Fragmentos dentro de `text` (separados por comas) que se pintan con `accentColor`. */
  accent: string;
  color: string;
  accentColor: string;
  /** Color de fondo de la franja del titular. */
  background: string;
  /** Tamaño de fuente en píxeles (desktop). */
  fontSize: number;
  /** Tamaño de los acentos respecto al resto del texto, en % (100 = igual). */
  accentScale: number;
  /** Fuente propia de cada texto; "" hereda la del tema. */
  fonts: TextFonts<CollectionHeadlineFontSlot>;
}

export const DEFAULT_COLLECTION_HEADLINE: CollectionHeadlineConfig = {
  text: "todo lo que tus cejas y pestañas necesitan",
  accent: "cejas, pestañas",
  color: "#FFFFFF",
  accentColor: "#EC7C97",
  background: "#DCC4B1",
  fontSize: 96,
  accentScale: 127,
  fonts: emptyTextFonts(COLLECTION_HEADLINE_FONT_SLOTS),
};

const isHexColor = (value: unknown): value is string =>
  typeof value === "string" &&
  /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(value.trim());

const clampFontSize = (n: number) => Math.max(14, Math.min(96, Math.round(n)));

export const ACCENT_SCALE_MIN = 100;
export const ACCENT_SCALE_MAX = 200;

export const clampAccentScale = (n: number) =>
  Math.max(ACCENT_SCALE_MIN, Math.min(ACCENT_SCALE_MAX, Math.round(n)));

export function parseCollectionHeadlineConfig(raw?: string | null): CollectionHeadlineConfig {
  if (!raw?.trim()) {
    return { ...DEFAULT_COLLECTION_HEADLINE };
  }

  const trimmed = raw.trim();
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as Partial<CollectionHeadlineConfig>;
      const fontSize =
        typeof parsed.fontSize === "number" && Number.isFinite(parsed.fontSize)
          ? clampFontSize(parsed.fontSize)
          : DEFAULT_COLLECTION_HEADLINE.fontSize;
      return {
        text:
          typeof parsed.text === "string" && parsed.text.trim()
            ? parsed.text.trim()
            : DEFAULT_COLLECTION_HEADLINE.text,
        accent:
          typeof parsed.accent === "string"
            ? parsed.accent.trim()
            : DEFAULT_COLLECTION_HEADLINE.accent,
        color: isHexColor(parsed.color)
          ? parsed.color.trim()
          : DEFAULT_COLLECTION_HEADLINE.color,
        accentColor: isHexColor(parsed.accentColor)
          ? parsed.accentColor.trim()
          : DEFAULT_COLLECTION_HEADLINE.accentColor,
        background: isHexColor(parsed.background)
          ? parsed.background.trim()
          : DEFAULT_COLLECTION_HEADLINE.background,
        fontSize,
        accentScale:
          typeof parsed.accentScale === "number" && Number.isFinite(parsed.accentScale)
            ? clampAccentScale(parsed.accentScale)
            : DEFAULT_COLLECTION_HEADLINE.accentScale,
        fonts: parseTextFonts(parsed.fonts, COLLECTION_HEADLINE_FONT_SLOTS),
      };
    } catch {
      /* plain text fallback */
    }
  }

  return {
    ...DEFAULT_COLLECTION_HEADLINE,
    text: trimmed || DEFAULT_COLLECTION_HEADLINE.text,
  };
}

export function serializeCollectionHeadlineConfig(config: CollectionHeadlineConfig): string {
  return JSON.stringify({
    text: config.text,
    accent: config.accent,
    color: config.color,
    accentColor: config.accentColor,
    background: config.background,
    fontSize: config.fontSize,
    accentScale: config.accentScale,
    fonts: serializeTextFonts(config.fonts),
  });
}

/** Partes del titular para resaltar el acento sin romper el texto. */
export function splitHeadlineByAccent(
  text: string,
  accent: string,
): { before: string; accent: string; after: string } | null {
  if (!accent.trim()) return null;
  const idx = text.toLowerCase().indexOf(accent.toLowerCase());
  if (idx === -1) return null;
  return {
    before: text.slice(0, idx),
    accent: text.slice(idx, idx + accent.length),
    after: text.slice(idx + accent.length),
  };
}

/**
 * Trocea el titular marcando cada aparición de los acentos (lista separada por
 * comas). Sin acentos que coincidan devuelve un único segmento sin marcar.
 */
export function splitHeadlineByAccents(
  text: string,
  accents: string,
): { text: string; accent: boolean }[] {
  const needles = accents
    .split(",")
    .map((a) => a.trim().toLowerCase())
    .filter(Boolean);
  const lower = text.toLowerCase();
  const segments: { text: string; accent: boolean }[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    let bestIdx = -1;
    let bestLen = 0;
    for (const needle of needles) {
      const idx = lower.indexOf(needle, cursor);
      if (idx === -1) continue;
      if (bestIdx === -1 || idx < bestIdx || (idx === bestIdx && needle.length > bestLen)) {
        bestIdx = idx;
        bestLen = needle.length;
      }
    }
    if (bestIdx === -1) break;
    if (bestIdx > cursor) segments.push({ text: text.slice(cursor, bestIdx), accent: false });
    segments.push({ text: text.slice(bestIdx, bestIdx + bestLen), accent: true });
    cursor = bestIdx + bestLen;
  }

  if (cursor < text.length) segments.push({ text: text.slice(cursor), accent: false });
  return segments;
}
