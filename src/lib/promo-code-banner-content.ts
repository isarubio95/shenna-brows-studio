import { emptyTextFonts, parseTextFonts, serializeTextFonts, type TextFonts } from "@/lib/fonts";

export const PROMO_CODE_BANNER_CONTENT_KEY = "index_promo_code";

/** Textos del bloque con fuente elegible en el panel. */
export const PROMO_CODE_BANNER_FONT_SLOTS = ["title", "subtitle", "code", "button"] as const;
export type PromoCodeBannerFontSlot = (typeof PROMO_CODE_BANNER_FONT_SLOTS)[number];

export interface PromoCodeBannerConfig {
  /** Muestra u oculta la sección en la home. */
  enabled: boolean;
  title: string;
  subtitle: string;
  /**
   * Código de `discount_codes` que se muestra y se copia. Vacío = sin asociar:
   * la sección no se pinta, para no anunciar un código que no existe.
   */
  code: string;
  copyText: string;
  /** Texto del botón durante unos segundos tras copiar. */
  copiedText: string;
  /** Degradado vertical del fondo; iguales = color sólido. */
  backgroundColor: string;
  backgroundColorEnd: string;
  titleColor: string;
  subtitleColor: string;
  /** Texto del código y borde discontinuo. */
  codeColor: string;
  buttonBg: string;
  buttonTextColor: string;
  /** Fuente propia de cada texto; "" hereda la del tema. */
  fonts: TextFonts<PromoCodeBannerFontSlot>;
}

/** Aspecto de la captura de referencia; el código se elige en el panel. */
export const DEFAULT_PROMO_CODE_BANNER: PromoCodeBannerConfig = {
  enabled: true,
  title: "¿ES TU PRIMER PEDIDO?",
  subtitle: "Te regalamos 10€ en tu primera compra",
  code: "",
  copyText: "Copiar código",
  copiedText: "¡Copiado!",
  backgroundColor: "#E4ACCF",
  backgroundColorEnd: "#BB8DA9",
  titleColor: "#4D0125",
  subtitleColor: "#551839",
  codeColor: "#440524",
  buttonBg: "#EAEAEA",
  buttonTextColor: "#302F35",
  fonts: {
    ...emptyTextFonts(PROMO_CODE_BANNER_FONT_SLOTS),
    title: "poppins",
    subtitle: "poppins",
    code: "poppins",
    button: "poppins",
  },
};

const isHexColor = (value: unknown): value is string =>
  typeof value === "string" &&
  /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(value.trim());

const text = (value: unknown, fallback: string) =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;

const color = (value: unknown, fallback: string) =>
  isHexColor(value) ? value.trim() : fallback;

/** Igual que el trigger de `discount_codes`: sin espacios y en mayúsculas. */
export const normalizePromoCode = (value: unknown) =>
  typeof value === "string" ? value.trim().toUpperCase() : "";

export function parsePromoCodeBannerConfig(raw?: string | null): PromoCodeBannerConfig {
  const trimmed = raw?.trim();
  if (!trimmed?.startsWith("{")) return { ...DEFAULT_PROMO_CODE_BANNER };

  try {
    const parsed = JSON.parse(trimmed) as Partial<Record<keyof PromoCodeBannerConfig, unknown>>;
    const d = DEFAULT_PROMO_CODE_BANNER;
    return {
      enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : d.enabled,
      title: text(parsed.title, d.title),
      subtitle: typeof parsed.subtitle === "string" ? parsed.subtitle.trim() : d.subtitle,
      code: normalizePromoCode(parsed.code),
      copyText: text(parsed.copyText, d.copyText),
      copiedText: text(parsed.copiedText, d.copiedText),
      backgroundColor: color(parsed.backgroundColor, d.backgroundColor),
      backgroundColorEnd: color(parsed.backgroundColorEnd, d.backgroundColorEnd),
      titleColor: color(parsed.titleColor, d.titleColor),
      subtitleColor: color(parsed.subtitleColor, d.subtitleColor),
      codeColor: color(parsed.codeColor, d.codeColor),
      buttonBg: color(parsed.buttonBg, d.buttonBg),
      buttonTextColor: color(parsed.buttonTextColor, d.buttonTextColor),
      fonts: parseTextFonts(parsed.fonts, PROMO_CODE_BANNER_FONT_SLOTS),
    };
  } catch {
    return { ...DEFAULT_PROMO_CODE_BANNER };
  }
}

export function serializePromoCodeBannerConfig(config: PromoCodeBannerConfig): string {
  return JSON.stringify({
    enabled: config.enabled,
    title: config.title,
    subtitle: config.subtitle,
    code: normalizePromoCode(config.code),
    copyText: config.copyText,
    copiedText: config.copiedText,
    backgroundColor: config.backgroundColor,
    backgroundColorEnd: config.backgroundColorEnd,
    titleColor: config.titleColor,
    subtitleColor: config.subtitleColor,
    codeColor: config.codeColor,
    buttonBg: config.buttonBg,
    buttonTextColor: config.buttonTextColor,
    fonts: serializeTextFonts(config.fonts),
  });
}
