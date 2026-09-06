export interface IndexVideoConfig {
  title: string;
  /** Fragmento del título que se pinta en dorado cursiva. */
  accent: string;
  videoUrl: string;
  posterUrl: string;
}

export const INDEX_VIDEO_PATH = "/videos/cejas-tratamiento.mp4";
export const INDEX_VIDEO_POSTER_PATH = "/videos/cejas-tratamiento-poster.jpg";

export const DEFAULT_INDEX_VIDEO: IndexVideoConfig = {
  title:
    "Mira como realizo un tratamiento de cejas profesional para que puedas hacerlo en casa",
  accent: "tratamiento de cejas profesional",
  videoUrl: INDEX_VIDEO_PATH,
  posterUrl: INDEX_VIDEO_POSTER_PATH,
};

const asString = (value: unknown, fallback: string) =>
  typeof value === "string" ? value : fallback;

export function resolveIndexVideoUrl(url: string | undefined | null): string {
  const trimmed = (url ?? "").trim();
  return trimmed || INDEX_VIDEO_PATH;
}

/** Portada: la subida, o la por defecto si sigue el vídeo original. */
export function resolveIndexVideoPosterSrc(config: Pick<IndexVideoConfig, "videoUrl" | "posterUrl">): string | undefined {
  const poster = config.posterUrl.trim();
  if (poster) return poster;
  const video = config.videoUrl.trim() || INDEX_VIDEO_PATH;
  if (video === INDEX_VIDEO_PATH) return INDEX_VIDEO_POSTER_PATH;
  return undefined;
}

export function parseIndexVideoConfig(raw?: string | null): IndexVideoConfig {
  if (!raw?.trim()) {
    return { ...DEFAULT_INDEX_VIDEO };
  }

  const trimmed = raw.trim();
  if (!trimmed.startsWith("{")) {
    return { ...DEFAULT_INDEX_VIDEO };
  }

  try {
    const parsed = JSON.parse(trimmed) as Partial<IndexVideoConfig>;
    return {
      title:
        asString(parsed.title, DEFAULT_INDEX_VIDEO.title).trim() || DEFAULT_INDEX_VIDEO.title,
      accent:
        typeof parsed.accent === "string"
          ? parsed.accent.trim()
          : DEFAULT_INDEX_VIDEO.accent,
      videoUrl: resolveIndexVideoUrl(parsed.videoUrl),
      posterUrl:
        typeof parsed.posterUrl === "string"
          ? parsed.posterUrl.trim()
          : resolveIndexVideoUrl(parsed.videoUrl) === INDEX_VIDEO_PATH
            ? DEFAULT_INDEX_VIDEO.posterUrl
            : "",
    };
  } catch {
    return { ...DEFAULT_INDEX_VIDEO };
  }
}

export function serializeIndexVideoConfig(config: IndexVideoConfig): string {
  return JSON.stringify({
    title: config.title.trim() || DEFAULT_INDEX_VIDEO.title,
    accent: config.accent.trim(),
    videoUrl: config.videoUrl.trim() || DEFAULT_INDEX_VIDEO.videoUrl,
    posterUrl: config.posterUrl.trim(),
  });
}
