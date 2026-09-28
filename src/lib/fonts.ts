import type { CSSProperties } from "react";

/**
 * Catálogo de tipografías que el panel deja elegir. Todas son de Google Fonts y
 * se cargan bajo demanda: una página solo descarga las que usa de verdad.
 */
export type FontCategory = "serif" | "display" | "sans" | "script";

export interface FontOption {
  id: string;
  label: string;
  category: FontCategory;
  /** Valor CSS de `font-family`, con su genérica de respaldo. */
  stack: string;
  /** Familia y ejes para `fonts.googleapis.com/css2?family=…` (validados contra la API). */
  query: string;
  /** Ya viene en index.html o en @fontsource: no hace falta inyectar nada. */
  preloaded?: boolean;
}

export const FONT_CATEGORY_LABELS: Record<FontCategory, string> = {
  serif: "Serif",
  display: "Display",
  sans: "Sans serif",
  script: "Caligráfica",
};

export const FONT_OPTIONS: FontOption[] = [
  {
    id: "playfair",
    label: "Playfair Display",
    category: "serif",
    stack: '"Playfair Display", serif',
    query: "Playfair+Display:ital,wght@0,400..900;1,400..900",
    preloaded: true,
  },
  {
    id: "cormorant",
    label: "Cormorant Garamond",
    category: "serif",
    stack: '"Cormorant Garamond", serif',
    query: "Cormorant+Garamond:ital,wght@0,300..700;1,300..700",
  },
  {
    id: "lora",
    label: "Lora",
    category: "serif",
    stack: '"Lora", serif',
    query: "Lora:ital,wght@0,400..700;1,400..700",
  },
  {
    id: "eb-garamond",
    label: "EB Garamond",
    category: "serif",
    stack: '"EB Garamond", serif',
    query: "EB+Garamond:ital,wght@0,400..800;1,400..800",
  },
  {
    id: "dm-serif",
    label: "DM Serif Display",
    category: "serif",
    stack: '"DM Serif Display", serif',
    query: "DM+Serif+Display:ital@0;1",
  },
  {
    id: "bodoni",
    label: "Bodoni Moda",
    category: "serif",
    stack: '"Bodoni Moda", serif',
    query: "Bodoni+Moda:ital,wght@0,400..900;1,400..900",
  },
  {
    id: "cinzel",
    label: "Cinzel",
    category: "serif",
    stack: '"Cinzel", serif',
    query: "Cinzel:wght@400..900",
  },
  {
    id: "italiana",
    label: "Italiana",
    category: "display",
    stack: '"Italiana", serif',
    query: "Italiana",
  },
  {
    id: "abril",
    label: "Abril Fatface",
    category: "display",
    stack: '"Abril Fatface", serif',
    query: "Abril+Fatface",
  },
  {
    id: "bebas",
    label: "Bebas Neue",
    category: "display",
    stack: '"Bebas Neue", sans-serif',
    query: "Bebas+Neue",
  },
  {
    id: "lato",
    label: "Lato",
    category: "sans",
    stack: '"Lato", sans-serif',
    query: "Lato:ital,wght@0,300;0,400;0,700;0,900;1,300;1,400;1,700",
    preloaded: true,
  },
  {
    id: "inter",
    label: "Inter",
    category: "sans",
    stack: '"Inter", sans-serif',
    query: "Inter:ital,wght@0,300..900;1,300..900",
    preloaded: true,
  },
  {
    id: "montserrat",
    label: "Montserrat",
    category: "sans",
    stack: '"Montserrat", sans-serif',
    query: "Montserrat:ital,wght@0,300..900;1,300..900",
  },
  {
    id: "poppins",
    label: "Poppins",
    category: "sans",
    stack: '"Poppins", sans-serif',
    query:
      "Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,300;1,400;1,500;1,600;1,700",
  },
  {
    id: "raleway",
    label: "Raleway",
    category: "sans",
    stack: '"Raleway", sans-serif',
    query: "Raleway:ital,wght@0,300..900;1,300..900",
  },
  {
    id: "josefin",
    label: "Josefin Sans",
    category: "sans",
    stack: '"Josefin Sans", sans-serif',
    query: "Josefin+Sans:ital,wght@0,300..700;1,300..700",
  },
  {
    id: "jost",
    label: "Jost",
    category: "sans",
    stack: '"Jost", sans-serif',
    query: "Jost:ital,wght@0,300..900;1,300..900",
  },
  {
    id: "great-vibes",
    label: "Great Vibes",
    category: "script",
    stack: '"Great Vibes", cursive',
    query: "Great+Vibes",
  },
  {
    id: "dancing-script",
    label: "Dancing Script",
    category: "script",
    stack: '"Dancing Script", cursive',
    query: "Dancing+Script:wght@400..700",
  },
  {
    id: "parisienne",
    label: "Parisienne",
    category: "script",
    stack: '"Parisienne", cursive',
    query: "Parisienne",
  },
];

const FONT_BY_ID = new Map(FONT_OPTIONS.map((f) => [f.id, f]));

export const isFontId = (value: unknown): value is string =>
  typeof value === "string" && FONT_BY_ID.has(value);

export const getFontOption = (id: string | null | undefined): FontOption | undefined =>
  id ? FONT_BY_ID.get(id) : undefined;

const GOOGLE_FONTS_CSS = "https://fonts.googleapis.com/css2";
const injected = new Set<string>();

const injectStylesheet = (fonts: FontOption[]) => {
  const pending = fonts.filter((f) => !f.preloaded && !injected.has(f.id));
  if (pending.length === 0 || typeof document === "undefined") return;
  for (const f of pending) injected.add(f.id);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `${GOOGLE_FONTS_CSS}?${pending.map((f) => `family=${f.query}`).join("&")}&display=swap`;
  link.dataset.siteFonts = pending.map((f) => f.id).join(" ");
  document.head.appendChild(link);
};

/** Inyecta (una sola vez por familia) la hoja de Google Fonts de las fuentes indicadas. */
export function loadFonts(ids: Iterable<string | null | undefined>) {
  const fonts: FontOption[] = [];
  for (const id of ids) {
    const font = getFontOption(id);
    if (font) fonts.push(font);
  }
  injectStylesheet(fonts);
}

/** Carga todo el catálogo de golpe (para las muestras del selector del panel). */
export function loadAllFonts() {
  injectStylesheet(FONT_OPTIONS);
}

/**
 * `font-family` de una fuente del catálogo, o `undefined` para heredar la del
 * tema. Carga la fuente como efecto secundario idempotente.
 */
export function fontFamily(id: string | null | undefined): string | undefined {
  const font = getFontOption(id);
  if (!font) return undefined;
  injectStylesheet([font]);
  return font.stack;
}

/** Estilo inline con la fuente elegida; vacío si el texto hereda la del tema. */
export function fontStyle(id: string | null | undefined): CSSProperties | undefined {
  const family = fontFamily(id);
  return family ? { fontFamily: family } : undefined;
}

/** Fuentes por texto de un bloque: `slot → id`. Vacío (o ausente) = hereda del tema. */
export type TextFonts<Slot extends string> = Record<Slot, string>;

export function emptyTextFonts<Slot extends string>(slots: readonly Slot[]): TextFonts<Slot> {
  return Object.fromEntries(slots.map((s) => [s, ""])) as TextFonts<Slot>;
}

/** Normaliza el objeto `fonts` guardado: descarta ids desconocidos y slots ajenos. */
export function parseTextFonts<Slot extends string>(
  raw: unknown,
  slots: readonly Slot[],
): TextFonts<Slot> {
  const fonts = emptyTextFonts(slots);
  if (!raw || typeof raw !== "object") return fonts;
  const record = raw as Record<string, unknown>;
  for (const slot of slots) {
    if (isFontId(record[slot])) fonts[slot] = record[slot] as string;
  }
  return fonts;
}

/** Solo los slots con fuente propia, para no engordar el JSON guardado. */
export function serializeTextFonts<Slot extends string>(
  fonts: Partial<TextFonts<Slot>> | undefined,
): Partial<TextFonts<Slot>> | undefined {
  if (!fonts) return undefined;
  const entries = Object.entries(fonts).filter(([, id]) => isFontId(id));
  return entries.length > 0 ? (Object.fromEntries(entries) as Partial<TextFonts<Slot>>) : undefined;
}
