export const ELIXIR_SPOTLIGHT_CONTENT_KEY = "site_elixir_spotlight";

/** Cinco ganchos caben en móvil sin que el botón de compra se aleje demasiado. */
export const ELIXIR_SPOTLIGHT_MAX_BENEFITS = 5;

/** `demoVideoId` para enseñar la foto del producto en lugar de un vídeo. */
export const ELIXIR_SPOTLIGHT_NO_VIDEO = "none";

export interface ElixirSpotlightConfig {
  /** Muestra u oculta el bloque en toda la web. */
  enabled: boolean;
  /** Producto protagonista: además sale el primero en todos los listados. */
  productSlug: string;
  eyebrow: string;
  /** Vacío = el nombre corto del producto (su categoría, p. ej. «ELIXIR»). */
  title: string;
  description: string;
  benefits: string[];
  /**
   * Foto o vídeo propio del bloque, subido desde el panel. Vacío = se usa un
   * vídeo de la ficha del producto (ver `demoVideoId`).
   */
  mediaUrl: string;
  /**
   * Vídeo de la ficha que hace de demostración si no hay `mediaUrl`. Vacío =
   * el de «Así se utiliza…» o, si no hay, el primero; `none` = la foto.
   */
  demoVideoId: string;
  ctaText: string;
  secondaryCtaText: string;
}

/** Vídeo que mandó la clienta el 18/10 para el bloque (en `public/videos`). */
export const ELIXIR_SPOTLIGHT_DEFAULT_MEDIA = "/videos/elixir-mas-vendido.mp4";

/** Ganchos de la captura «¿Por qué elegir ELIXIR?» de la clienta. */
export const DEFAULT_ELIXIR_SPOTLIGHT: ElixirSpotlightConfig = {
  enabled: true,
  productSlug: "elixir",
  eyebrow: "El más vendido",
  title: "",
  description:
    "El fijador híbrido de cejas y pestañas de Shenna BROWS: fijación y cuidado diario en un solo gesto.",
  benefits: [
    "Fijación con acabado natural",
    "Sin residuos blancos visibles",
    "Fijación y cuidado en una misma fórmula",
    "Enriquecido con péptidos y activos cosméticos",
    "Cejas y pestañas en un solo gesto",
  ],
  mediaUrl: ELIXIR_SPOTLIGHT_DEFAULT_MEDIA,
  demoVideoId: "",
  ctaText: "Añadir al carrito",
  secondaryCtaText: "Ver ficha completa",
};

const str = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function parseElixirSpotlightConfig(raw?: string | null): ElixirSpotlightConfig {
  const d = DEFAULT_ELIXIR_SPOTLIGHT;
  const trimmed = raw?.trim();
  if (!trimmed?.startsWith("{")) return { ...d, benefits: [...d.benefits] };

  try {
    const parsed = JSON.parse(trimmed) as Partial<Record<keyof ElixirSpotlightConfig, unknown>>;
    const slug = str(parsed.productSlug).toLowerCase();
    const benefits = Array.isArray(parsed.benefits)
      ? parsed.benefits.map(str).filter(Boolean).slice(0, ELIXIR_SPOTLIGHT_MAX_BENEFITS)
      : [...d.benefits];
    return {
      enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : d.enabled,
      productSlug: SLUG_RE.test(slug) ? slug : d.productSlug,
      eyebrow: typeof parsed.eyebrow === "string" ? parsed.eyebrow.trim() : d.eyebrow,
      title: str(parsed.title),
      description: typeof parsed.description === "string" ? parsed.description.trim() : d.description,
      benefits,
      mediaUrl: typeof parsed.mediaUrl === "string" ? parsed.mediaUrl.trim() : d.mediaUrl,
      demoVideoId: str(parsed.demoVideoId),
      ctaText: str(parsed.ctaText) || d.ctaText,
      secondaryCtaText:
        typeof parsed.secondaryCtaText === "string" ? parsed.secondaryCtaText.trim() : d.secondaryCtaText,
    };
  } catch {
    return { ...d, benefits: [...d.benefits] };
  }
}

export function serializeElixirSpotlightConfig(config: ElixirSpotlightConfig): string {
  return JSON.stringify({
    enabled: config.enabled,
    productSlug: config.productSlug.trim().toLowerCase(),
    eyebrow: config.eyebrow.trim(),
    title: config.title.trim(),
    description: config.description.trim(),
    benefits: config.benefits.map((b) => b.trim()).filter(Boolean).slice(0, ELIXIR_SPOTLIGHT_MAX_BENEFITS),
    mediaUrl: config.mediaUrl.trim(),
    demoVideoId: config.demoVideoId.trim(),
    ctaText: config.ctaText.trim(),
    secondaryCtaText: config.secondaryCtaText.trim(),
  });
}

/** Títulos que delatan el vídeo de modo de uso («Así se utiliza Elixir»). */
const DEMO_TITLE_RE = /\bse (utiliza|usa|aplica)\b|modo de (uso|empleo)|c[oó]mo (usar|utilizar|aplicar)/i;

/**
 * Vídeo de demostración entre los de la ficha: el elegido en el panel, o el de
 * modo de uso, o el primero. `null` = enseñar la foto.
 */
export function pickDemoVideo<T extends { id: string; title: string }>(
  videos: T[],
  demoVideoId: string,
): T | null {
  if (demoVideoId === ELIXIR_SPOTLIGHT_NO_VIDEO || videos.length === 0) return null;
  return (
    videos.find((video) => video.id === demoVideoId) ??
    videos.find((video) => DEMO_TITLE_RE.test(video.title)) ??
    videos[0]
  );
}
