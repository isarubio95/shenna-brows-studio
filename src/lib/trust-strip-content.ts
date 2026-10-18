import { marketingIcon, type MarketingIconId } from "@/lib/marketing-icons";

export const TRUST_STRIP_CONTENT_KEY = "site_trust_strip";

/** Cuatro ventajas en fila: más no caben bien en móvil (2×2) ni en la ficha. */
export const TRUST_STRIP_MAX_ITEMS = 4;

export interface TrustStripItem {
  icon: MarketingIconId;
  /** Versión completa (debajo de la marquesina y en el resto de páginas). */
  title: string;
  subtitle: string;
  /** Versión compacta de la ficha de producto; vacío = el título de arriba. */
  compactTitle: string;
  /** Vacío = sin subtítulo en la ficha. */
  compactSubtitle: string;
}

export interface TrustStripConfig {
  /** Muestra u oculta la franja en toda la web (también en la ficha). */
  enabled: boolean;
  /** Título de la versión compacta de la ficha de producto. */
  compactHeading: string;
  items: TrustStripItem[];
}

/** Plazo de entrega pendiente de confirmar: el vídeo dice «envío en máximo 24 horas». */
export const TRUST_STRIP_PROVISIONAL_DELIVERY = {
  title: "Entrega en 2–3 días",
  subtitle: "Laborables, según las condiciones de envío",
};

/** Contenido de las capturas de la clienta (franja y «Tus ventajas…»). */
export const DEFAULT_TRUST_STRIP: TrustStripConfig = {
  enabled: true,
  compactHeading: "Tus ventajas al comprar en Shenna BROWS",
  items: [
    {
      icon: "truck",
      title: "Envío gratis",
      subtitle: "En pedidos superiores a 50 €",
      compactTitle: "Envío gratis",
      compactSubtitle: "Desde 50 €",
    },
    {
      icon: "package-check",
      title: TRUST_STRIP_PROVISIONAL_DELIVERY.title,
      subtitle: TRUST_STRIP_PROVISIONAL_DELIVERY.subtitle,
      compactTitle: TRUST_STRIP_PROVISIONAL_DELIVERY.title,
      compactSubtitle: "Laborables",
    },
    {
      icon: "shield-check",
      title: "Pago seguro",
      subtitle: "Métodos de pago disponibles en la tienda",
      compactTitle: "Pago seguro",
      compactSubtitle: "",
    },
    {
      icon: "message-circle",
      title: "Te acompañamos",
      subtitle: "Atención cercana a través de WhatsApp",
      compactTitle: "Atención por WhatsApp",
      compactSubtitle: "",
    },
  ],
};

const str = (value: unknown) => (typeof value === "string" ? value.trim() : "");

function parseItem(raw: unknown, fallback: TrustStripItem): TrustStripItem | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Partial<Record<keyof TrustStripItem, unknown>>;
  const title = str(row.title);
  if (!title) return null;
  return {
    icon: marketingIcon(row.icon, fallback.icon),
    title,
    subtitle: str(row.subtitle),
    compactTitle: str(row.compactTitle),
    compactSubtitle: str(row.compactSubtitle),
  };
}

export function parseTrustStripConfig(raw?: string | null): TrustStripConfig {
  const trimmed = raw?.trim();
  if (!trimmed?.startsWith("{")) return cloneTrustStrip(DEFAULT_TRUST_STRIP);

  try {
    const parsed = JSON.parse(trimmed) as Partial<Record<keyof TrustStripConfig, unknown>>;
    const d = DEFAULT_TRUST_STRIP;
    const items = Array.isArray(parsed.items)
      ? parsed.items
          .slice(0, TRUST_STRIP_MAX_ITEMS)
          .map((item, i) => parseItem(item, d.items[i] ?? d.items[0]))
          .filter((item): item is TrustStripItem => item !== null)
      : [];
    return {
      enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : d.enabled,
      compactHeading: str(parsed.compactHeading) || d.compactHeading,
      items: items.length > 0 ? items : cloneTrustStrip(d).items,
    };
  } catch {
    return cloneTrustStrip(DEFAULT_TRUST_STRIP);
  }
}

export function serializeTrustStripConfig(config: TrustStripConfig): string {
  return JSON.stringify({
    enabled: config.enabled,
    compactHeading: config.compactHeading.trim(),
    items: config.items.slice(0, TRUST_STRIP_MAX_ITEMS).map((item) => ({
      icon: item.icon,
      title: item.title.trim(),
      subtitle: item.subtitle.trim(),
      compactTitle: item.compactTitle.trim(),
      compactSubtitle: item.compactSubtitle.trim(),
    })),
  });
}

export function cloneTrustStrip(config: TrustStripConfig): TrustStripConfig {
  return { ...config, items: config.items.map((item) => ({ ...item })) };
}
