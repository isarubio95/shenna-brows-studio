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
};

const isHexColor = (value: unknown): value is string =>
  typeof value === "string" &&
  /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(value.trim());

const asString = (value: unknown, fallback: string) =>
  typeof value === "string" ? value : fallback;

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
      eyebrow:
        asString(parsed.eyebrow, DEFAULT_WELCOME_POPUP.eyebrow).trim() ||
        DEFAULT_WELCOME_POPUP.eyebrow,
      offerAmount:
        asString(parsed.offerAmount, DEFAULT_WELCOME_POPUP.offerAmount).trim() ||
        DEFAULT_WELCOME_POPUP.offerAmount,
      offerSuffix:
        asString(parsed.offerSuffix, DEFAULT_WELCOME_POPUP.offerSuffix).trim() ||
        DEFAULT_WELCOME_POPUP.offerSuffix,
      badgeText:
        asString(parsed.badgeText, DEFAULT_WELCOME_POPUP.badgeText).trim() ||
        DEFAULT_WELCOME_POPUP.badgeText,
      primaryCta:
        asString(parsed.primaryCta, DEFAULT_WELCOME_POPUP.primaryCta).trim() ||
        DEFAULT_WELCOME_POPUP.primaryCta,
      secondaryCta:
        asString(parsed.secondaryCta, DEFAULT_WELCOME_POPUP.secondaryCta).trim() ||
        DEFAULT_WELCOME_POPUP.secondaryCta,
      emailTitle:
        asString(parsed.emailTitle, DEFAULT_WELCOME_POPUP.emailTitle).trim() ||
        DEFAULT_WELCOME_POPUP.emailTitle,
      emailDescription:
        asString(parsed.emailDescription, DEFAULT_WELCOME_POPUP.emailDescription).trim() ||
        DEFAULT_WELCOME_POPUP.emailDescription,
      emailCta:
        asString(parsed.emailCta, DEFAULT_WELCOME_POPUP.emailCta).trim() ||
        DEFAULT_WELCOME_POPUP.emailCta,
      pink: isHexColor(parsed.pink) ? parsed.pink.trim() : DEFAULT_WELCOME_POPUP.pink,
      gold: isHexColor(parsed.gold) ? parsed.gold.trim() : DEFAULT_WELCOME_POPUP.gold,
      delayMs: clampDelay(delayRaw),
      alt: asString(parsed.alt, DEFAULT_WELCOME_POPUP.alt).trim() || DEFAULT_WELCOME_POPUP.alt,
    };
  } catch {
    return { ...DEFAULT_WELCOME_POPUP };
  }
}

export function serializeWelcomePopupConfig(config: WelcomePopupConfig): string {
  return JSON.stringify({
    enabled: Boolean(config.enabled),
    imageUrl: config.imageUrl.trim(),
    eyebrow: config.eyebrow.trim() || DEFAULT_WELCOME_POPUP.eyebrow,
    offerAmount: config.offerAmount.trim() || DEFAULT_WELCOME_POPUP.offerAmount,
    offerSuffix: config.offerSuffix.trim() || DEFAULT_WELCOME_POPUP.offerSuffix,
    badgeText: config.badgeText.trim() || DEFAULT_WELCOME_POPUP.badgeText,
    primaryCta: config.primaryCta.trim() || DEFAULT_WELCOME_POPUP.primaryCta,
    secondaryCta: config.secondaryCta.trim() || DEFAULT_WELCOME_POPUP.secondaryCta,
    emailTitle: config.emailTitle.trim() || DEFAULT_WELCOME_POPUP.emailTitle,
    emailDescription:
      config.emailDescription.trim() || DEFAULT_WELCOME_POPUP.emailDescription,
    emailCta: config.emailCta.trim() || DEFAULT_WELCOME_POPUP.emailCta,
    pink: isHexColor(config.pink) ? config.pink.trim() : DEFAULT_WELCOME_POPUP.pink,
    gold: isHexColor(config.gold) ? config.gold.trim() : DEFAULT_WELCOME_POPUP.gold,
    delayMs: clampDelay(config.delayMs),
    alt: config.alt.trim() || DEFAULT_WELCOME_POPUP.alt,
  });
}
