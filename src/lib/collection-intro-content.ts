export const COLLECTION_INTRO_CONTENT_KEY = "index_collection_intro";

export interface CollectionIntroConfig {
  title: string;
  /** Vacío = sin subtítulo. */
  subtitle: string;
}

/**
 * Pendiente del texto nuevo de la clienta: el antiguo («Cinco herramientas
 * esenciales para la artista…») sonaba solo a profesionales. Este es el que ya
 * se publicó en su lugar el 06/09 y queda como provisional.
 */
export const COLLECTION_INTRO_PROVISIONAL_SUBTITLE =
  "Todo lo que necesitas para cuidar, definir y realzar tus cejas, con la precisión de la experiencia profesional.";

export const DEFAULT_COLLECTION_INTRO: CollectionIntroConfig = {
  title: "Nuestra colección",
  subtitle: COLLECTION_INTRO_PROVISIONAL_SUBTITLE,
};

export function parseCollectionIntroConfig(raw?: string | null): CollectionIntroConfig {
  const d = DEFAULT_COLLECTION_INTRO;
  const trimmed = raw?.trim();
  if (!trimmed?.startsWith("{")) return { ...d };

  try {
    const parsed = JSON.parse(trimmed) as Partial<Record<keyof CollectionIntroConfig, unknown>>;
    return {
      title: typeof parsed.title === "string" && parsed.title.trim() ? parsed.title.trim() : d.title,
      subtitle: typeof parsed.subtitle === "string" ? parsed.subtitle.trim() : d.subtitle,
    };
  } catch {
    return { ...d };
  }
}

export function serializeCollectionIntroConfig(config: CollectionIntroConfig): string {
  return JSON.stringify({ title: config.title.trim(), subtitle: config.subtitle.trim() });
}
