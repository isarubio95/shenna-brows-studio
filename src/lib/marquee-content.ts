export interface MarqueeConfig {
  items: string[];
  background: string;
  /** Padding vertical en píxeles (arriba y abajo). */
  paddingY: number;
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
  paddingY: 26,
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
        paddingY,
      };
    } catch {
      /* fallback a líneas */
    }
  }

  return {
    items: parseItemsFromLines(trimmed),
    background: DEFAULT_MARQUEE_CONFIG.background,
    paddingY: DEFAULT_MARQUEE_CONFIG.paddingY,
  };
}

export function serializeMarqueeConfig(config: MarqueeConfig): string {
  return JSON.stringify({
    items: config.items,
    background: config.background,
    paddingY: config.paddingY,
  });
}

export function marqueeItemsToText(items: string[]): string {
  return items.join("\n");
}

export function marqueeTextToItems(text: string): string[] {
  return parseItemsFromLines(text);
}
