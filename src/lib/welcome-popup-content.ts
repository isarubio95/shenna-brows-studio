import { emptyTextFonts, parseTextFonts, serializeTextFonts, type TextFonts } from "@/lib/fonts";
import { isSiteCtaSize, type SiteCtaSize } from "@/lib/site-cta";

/** Textos del bloque con fuente elegible en el panel. */
export const WELCOME_POPUP_FONT_SLOTS = ["eyebrow", "offer", "offerSuffix", "badge", "primaryCta", "secondaryCta", "emailTitle", "emailDescription", "emailCta"] as const;
export type WelcomePopupFontSlot = (typeof WELCOME_POPUP_FONT_SLOTS)[number];

export interface WelcomePopupConfig {
  enabled: boolean;
  imageUrl: string;
  eyebrow: string;
  offerAmount: string;
  offerSuffix: string;
  badgeText: string;
  primaryCta: string;
  secondaryCta: string;
  emailTitle: string;
  emailDescription: string;
  emailCta: string;
  pink: string;
  gold: string;
  delayMs: number;
  alt: string;
  /** Tamaño de los botones sobre la imagen. */
  ctaSize: SiteCtaSize;
  /** Fuente propia de cada texto; "" hereda la del tema. */
  fonts: TextFonts<WelcomePopupFontSlot>;
}

export const DEFAULT_WELCOME_POPUP: WelcomePopupConfig = {
  enabled: true,
  imageUrl: "",
  eyebrow: "CONSIGUE",
  offerAmount: "10€",
  offerSuffix: "DE DESCUENTO",
  badgeText: "EN TU PRIMER PEDIDO",
  primaryCta: "LO QUIERO",
  secondaryCta: "NO, GRACIAS",
  emailTitle: "Recibe tu código",
  emailDescription:
    "Déjanos tu email y te enviamos el descuento de 10€ para tu primer pedido (mín. 50€).",
  emailCta: "Suscribirme",
  pink: "#E9808E",
  gold: "#C5A059",
  delayMs: 1300,
  alt: "Oferta de bienvenida Shenna Brows",
  ctaSize: "md",
  fonts: emptyTextFonts(WELCOME_POPUP_FONT_SLOTS),
};

const isHexColor = (value: unknown): value is string =>
  typeof value === "string" &&
  /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(value.trim());

const asString = (value: unknown, fallback: string) =>
  typeof value === "string" ? value : fallback;

/**
 * Textos que la admin puede vaciar para dejar solo la imagen: "" se respeta.
 * Solo un campo que nunca se guardó (configs antiguas) toma el texto original.
 */
const freeText = (value: unknown, fallback: string) =>
  typeof value === "string" ? value.trim() : fallback;

/** Un botón necesita texto: vacío vuelve al original. */
const buttonText = (value: unknown, fallback: string) =>
  (typeof value === "string" ? value.trim() : "") || fallback;

const clampDelay = (n: number) => Math.min(15000, Math.max(0, Math.round(n)));

export function parseWelcomePopupConfig(raw?: string | null): WelcomePopupConfig {
  if (!raw?.trim()) {
    return { ...DEFAULT_WELCOME_POPUP };
  }

  const trimmed = raw.trim();
  if (!trimmed.startsWith("{")) {
    return { ...DEFAULT_WELCOME_POPUP };
  }

  try {
    const parsed = JSON.parse(trimmed) as Partial<WelcomePopupConfig>;
    const delayRaw =
      typeof parsed.delayMs === "number" && Number.isFinite(parsed.delayMs)
        ? parsed.delayMs
        : DEFAULT_WELCOME_POPUP.delayMs;

    return {
      enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : DEFAULT_WELCOME_POPUP.enabled,
      imageUrl: asString(parsed.imageUrl, DEFAULT_WELCOME_POPUP.imageUrl).trim(),
      eyebrow: freeText(parsed.eyebrow, DEFAULT_WELCOME_POPUP.eyebrow),
      offerAmount: freeText(parsed.offerAmount, DEFAULT_WELCOME_POPUP.offerAmount),
      offerSuffix: freeText(parsed.offerSuffix, DEFAULT_WELCOME_POPUP.offerSuffix),
      badgeText: freeText(parsed.badgeText, DEFAULT_WELCOME_POPUP.badgeText),
      primaryCta: buttonText(parsed.primaryCta, DEFAULT_WELCOME_POPUP.primaryCta),
      secondaryCta: buttonText(parsed.secondaryCta, DEFAULT_WELCOME_POPUP.secondaryCta),
      emailTitle: freeText(parsed.emailTitle, DEFAULT_WELCOME_POPUP.emailTitle),
      emailDescription: freeText(parsed.emailDescription, DEFAULT_WELCOME_POPUP.emailDescription),
      emailCta: buttonText(parsed.emailCta, DEFAULT_WELCOME_POPUP.emailCta),
      pink: isHexColor(parsed.pink) ? parsed.pink.trim() : DEFAULT_WELCOME_POPUP.pink,
      gold: isHexColor(parsed.gold) ? parsed.gold.trim() : DEFAULT_WELCOME_POPUP.gold,
      delayMs: clampDelay(delayRaw),
      alt: asString(parsed.alt, DEFAULT_WELCOME_POPUP.alt).trim() || DEFAULT_WELCOME_POPUP.alt,
      ctaSize: isSiteCtaSize(parsed.ctaSize) ? parsed.ctaSize : DEFAULT_WELCOME_POPUP.ctaSize,
      fonts: parseTextFonts(parsed.fonts, WELCOME_POPUP_FONT_SLOTS),
    };
  } catch {
    return { ...DEFAULT_WELCOME_POPUP };
  }
}

export function serializeWelcomePopupConfig(config: WelcomePopupConfig): string {
  return JSON.stringify({
    enabled: Boolean(config.enabled),
    imageUrl: config.imageUrl.trim(),
    eyebrow: config.eyebrow.trim(),
    offerAmount: config.offerAmount.trim(),
    offerSuffix: config.offerSuffix.trim(),
    badgeText: config.badgeText.trim(),
    primaryCta: config.primaryCta.trim() || DEFAULT_WELCOME_POPUP.primaryCta,
    secondaryCta: config.secondaryCta.trim() || DEFAULT_WELCOME_POPUP.secondaryCta,
    emailTitle: config.emailTitle.trim(),
    emailDescription: config.emailDescription.trim(),
    emailCta: config.emailCta.trim() || DEFAULT_WELCOME_POPUP.emailCta,
    pink: isHexColor(config.pink) ? config.pink.trim() : DEFAULT_WELCOME_POPUP.pink,
    gold: isHexColor(config.gold) ? config.gold.trim() : DEFAULT_WELCOME_POPUP.gold,
    delayMs: clampDelay(config.delayMs),
    alt: config.alt.trim() || DEFAULT_WELCOME_POPUP.alt,
    ctaSize: isSiteCtaSize(config.ctaSize) ? config.ctaSize : DEFAULT_WELCOME_POPUP.ctaSize,
    fonts: serializeTextFonts(config.fonts),
  });
}

/** Hay algún texto sobre la imagen en el primer paso (si no, va sin velo). */
export function welcomePopupHasOfferText(
  config: Pick<WelcomePopupConfig, "eyebrow" | "offerAmount" | "offerSuffix" | "badgeText">,
): boolean {
  return Boolean(
    config.eyebrow.trim() || config.offerAmount.trim() || config.offerSuffix.trim() || config.badgeText.trim(),
  );
}
