import { emptyTextFonts, parseTextFonts, serializeTextFonts, type TextFonts } from "@/lib/fonts";

export const ABOUT_SECTION_KEYS = [
  "about_section_1",
  "about_section_2",
  "about_section_3",
  "about_section_4",
] as const;

/** Textos de cada sección de "Sobre mí" con fuente elegible en el panel. */
export const ABOUT_FONT_SLOTS = ["title", "text"] as const;
export type AboutFontSlot = (typeof ABOUT_FONT_SLOTS)[number];

/** Contenido de la columna `content` de una sección de "Sobre mí". */
export interface AboutSectionContent {
  text: string;
  fonts: TextFonts<AboutFontSlot>;
}

export const isAboutSectionKey = (key: string) =>
  (ABOUT_SECTION_KEYS as readonly string[]).includes(key);

/**
 * Las secciones se guardaban como texto plano; solo pasan a JSON
 * (`{ text, fonts }`) cuando alguna tiene fuente propia.
 */
export function parseAboutSectionContent(raw?: string | null): AboutSectionContent {
  const value = raw ?? "";
  const trimmed = value.trim();
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as { text?: unknown; fonts?: unknown };
      if (typeof parsed.text === "string") {
        return { text: parsed.text, fonts: parseTextFonts(parsed.fonts, ABOUT_FONT_SLOTS) };
      }
    } catch {
      /* texto plano que empieza por "{" */
    }
  }
  return { text: value, fonts: emptyTextFonts(ABOUT_FONT_SLOTS) };
}

export function serializeAboutSectionContent(content: AboutSectionContent): string {
  const fonts = serializeTextFonts(content.fonts);
  return fonts ? JSON.stringify({ text: content.text, fonts }) : content.text;
}
