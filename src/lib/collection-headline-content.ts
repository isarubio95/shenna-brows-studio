export interface CollectionHeadlineConfig {
  /** Texto completo del titular. */
  text: string;
  /** Fragmento dentro de `text` que se pinta con `accentColor`. */
  accent: string;
  color: string;
  accentColor: string;
  /** Tamaño de fuente en píxeles (desktop). */
  fontSize: number;
}

export const DEFAULT_COLLECTION_HEADLINE: CollectionHeadlineConfig = {
  text: "Todo lo que tus cejas necesitan",
  accent: "tus cejas",
  color: "#1A1A1A",
  accentColor: "#C5A059",
  fontSize: 24,
};

const isHexColor = (value: unknown): value is string =>
  typeof value === "string" &&
  /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(value.trim());

const clampFontSize = (n: number) => Math.max(14, Math.min(96, Math.round(n)));

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
        fontSize,
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
    fontSize: config.fontSize,
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
