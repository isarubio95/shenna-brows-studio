/** Mismo rosa que el CTA de la campaña publicitaria (`DEFAULT_CAMPAIGN.ctaBg`). */
export const WHATSAPP_DEFAULT_PINK = "#E9808E";

export interface WhatsAppButtonConfig {
  enabled: boolean;
  /** Número internacional solo dígitos, p. ej. 34633979945. */
  phone: string;
  /** Mensaje precargado al abrir el chat (opcional). */
  message: string;
  background: string;
  iconColor: string;
}

export const DEFAULT_WHATSAPP_BUTTON: WhatsAppButtonConfig = {
  enabled: true,
  phone: "34633979945",
  message: "",
  background: WHATSAPP_DEFAULT_PINK,
  iconColor: "#FFFFFF",
};

const HEX_RE = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;

const isHexColor = (value: unknown): value is string =>
  typeof value === "string" && HEX_RE.test(value.trim());

const asString = (value: unknown, fallback: string) =>
  typeof value === "string" ? value : fallback;

export function normalizeWhatsAppPhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function buildWhatsAppHref(config: Pick<WhatsAppButtonConfig, "phone" | "message">): string {
  const phone =
    normalizeWhatsAppPhone(config.phone) || DEFAULT_WHATSAPP_BUTTON.phone;
  const base = `https://wa.me/${phone}`;
  const message = config.message.trim();
  if (!message) return base;
  return `${base}?text=${encodeURIComponent(message)}`;
}

export function parseWhatsAppButtonConfig(raw?: string | null): WhatsAppButtonConfig {
  if (!raw?.trim()) {
    return { ...DEFAULT_WHATSAPP_BUTTON };
  }

  const trimmed = raw.trim();
  if (!trimmed.startsWith("{")) {
    return { ...DEFAULT_WHATSAPP_BUTTON };
  }

  try {
    const parsed = JSON.parse(trimmed) as Partial<WhatsAppButtonConfig>;
    const phone =
      normalizeWhatsAppPhone(asString(parsed.phone, DEFAULT_WHATSAPP_BUTTON.phone)) ||
      DEFAULT_WHATSAPP_BUTTON.phone;
    return {
      enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : DEFAULT_WHATSAPP_BUTTON.enabled,
      phone,
      message: asString(parsed.message, DEFAULT_WHATSAPP_BUTTON.message),
      background: isHexColor(parsed.background)
        ? parsed.background.trim()
        : DEFAULT_WHATSAPP_BUTTON.background,
      iconColor: isHexColor(parsed.iconColor)
        ? parsed.iconColor.trim()
        : DEFAULT_WHATSAPP_BUTTON.iconColor,
    };
  } catch {
    return { ...DEFAULT_WHATSAPP_BUTTON };
  }
}

export function serializeWhatsAppButtonConfig(config: WhatsAppButtonConfig): string {
  return JSON.stringify({
    enabled: Boolean(config.enabled),
    phone: normalizeWhatsAppPhone(config.phone) || DEFAULT_WHATSAPP_BUTTON.phone,
    message: config.message.trim(),
    background: config.background,
    iconColor: config.iconColor,
  });
}
