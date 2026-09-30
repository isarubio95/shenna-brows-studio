import { emptyTextFonts, parseTextFonts, serializeTextFonts, type TextFonts } from "@/lib/fonts";

/** Textos del bloque con fuente elegible en el panel. */
export const MARQUEE_FONT_SLOTS = ["items"] as const;
export type MarqueeFontSlot = (typeof MARQUEE_FONT_SLOTS)[number];

export interface MarqueeConfig {
  items: string[];
  background: string;
  /** Color del texto (hex, admite alfa). */
  textColor: string;
  /** Padding vertical en píxeles (arriba y abajo). */
  paddingY: number;
  /** Fuente propia de cada texto; "" hereda la del tema. */
  fonts: TextFonts<MarqueeFontSlot>;
}

export const DEFAULT_MARQUEE_ITEMS = [
  "PARA MICROPIGMENTACIÓN",
  "MOUSSE LIMPIADORA",
  "HERRAMIENTAS ARTESANALES GOLD EDITION",
  "FÓRMULAS DISEÑADAS PARA CEJAS",
  "RUTINA COMPLETA",
  "SHENNA",
];

export const DEFAULT_MARQUEE_CONFIG: MarqueeConfig = {
  items: DEFAULT_MARQUEE_ITEMS,
  background: "#F8F3EB",
  /** Equivale a text-carbon/70, el color que tenía antes de ser editable. */
  textColor: "#1A1A1AB3",
  paddingY: 26,
  fonts: emptyTextFonts(MARQUEE_FONT_SLOTS),
};

const isHexColor = (value: unknown): value is string =>
  typeof value === "string" &&
  /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(value.trim());

const parseItemsFromLines = (raw: string): string[] => {
  const items = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return items.length > 0 ? items : DEFAULT_MARQUEE_ITEMS;
};

/** Acepta JSON nuevo o el formato legacy (una frase por línea). */
export function parseMarqueeConfig(raw?: string | null): MarqueeConfig {
  if (!raw?.trim()) return { ...DEFAULT_MARQUEE_CONFIG, items: [...DEFAULT_MARQUEE_ITEMS] };

  const trimmed = raw.trim();
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as Partial<MarqueeConfig> & { items?: unknown };
      const items = Array.isArray(parsed.items)
        ? parsed.items.map((i) => String(i).trim()).filter(Boolean)
        : DEFAULT_MARQUEE_ITEMS;
      const paddingY =
        typeof parsed.paddingY === "number" && Number.isFinite(parsed.paddingY)
          ? Math.max(0, Math.min(96, Math.round(parsed.paddingY)))
          : DEFAULT_MARQUEE_CONFIG.paddingY;
      return {
        items: items.length > 0 ? items : [...DEFAULT_MARQUEE_ITEMS],
        background: isHexColor(parsed.background)
          ? parsed.background.trim()
          : DEFAULT_MARQUEE_CONFIG.background,
        textColor: isHexColor(parsed.textColor)
          ? parsed.textColor.trim()
          : DEFAULT_MARQUEE_CONFIG.textColor,
        paddingY,
        fonts: parseTextFonts(parsed.fonts, MARQUEE_FONT_SLOTS),
      };
    } catch {
      /* fallback a líneas */
    }
  }

  return {
    items: parseItemsFromLines(trimmed),
    background: DEFAULT_MARQUEE_CONFIG.background,
    textColor: DEFAULT_MARQUEE_CONFIG.textColor,
    paddingY: DEFAULT_MARQUEE_CONFIG.paddingY,
    fonts: DEFAULT_MARQUEE_CONFIG.fonts,
  };
}

export function serializeMarqueeConfig(config: MarqueeConfig): string {
  return JSON.stringify({
    items: config.items,
    background: config.background,
    textColor: config.textColor,
    paddingY: config.paddingY,
    fonts: serializeTextFonts(config.fonts),
  });
}

export function marqueeItemsToText(items: string[]): string {
  return items.join("\n");
}

export function marqueeTextToItems(text: string): string[] {
  return parseItemsFromLines(text);
}
