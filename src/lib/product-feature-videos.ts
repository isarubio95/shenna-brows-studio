/**
 * Vídeos explicativos opcionales de una ficha de producto (`products.feature_videos`).
 *
 * En ordenador se apilan en la columna de la izquierda, junto a la descripción;
 * en móvil salen en un carrusel debajo de «Envío». Cada vídeo lleva un título
 * que dice qué se ve en él (anuncio, modo de uso, ingredientes…).
 */
export type ProductFeatureVideo = {
  id: string;
  title: string;
  videoUrl: string;
  /** Ancho/alto del archivo subido; reserva el hueco antes de que cargue. */
  aspectRatio: number | null;
};

/** Tope de vídeos por ficha. Tres es lo habitual; el cuarto deja margen. */
export const PRODUCT_FEATURE_VIDEOS_MAX = 4;

/** Proporción que se asume cuando no se pudo leer la del archivo (vídeo vertical). */
export const PRODUCT_FEATURE_VIDEO_FALLBACK_ASPECT = 9 / 16;

const MIN_ASPECT = 0.2;
const MAX_ASPECT = 5;

const normalizeAspectRatio = (value: unknown): number | null => {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < MIN_ASPECT || n > MAX_ASPECT) return null;
  return Math.round(n * 10000) / 10000;
};

export function parseProductFeatureVideos(value: unknown): ProductFeatureVideo[] {
  if (!value) return [];
  let arr: unknown[] = [];
  if (Array.isArray(value)) arr = value;
  else if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) arr = parsed;
    } catch {
      return [];
    }
  } else return [];

  const out: ProductFeatureVideo[] = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const videoUrl = String(o.videoUrl ?? "").trim();
    if (!videoUrl) continue;
    const id = String(o.id ?? "").trim() || `${out.length + 1}-${videoUrl}`;
    out.push({
      id,
      title: String(o.title ?? "").trim(),
      videoUrl,
      aspectRatio: normalizeAspectRatio(o.aspectRatio),
    });
    if (out.length >= PRODUCT_FEATURE_VIDEOS_MAX) break;
  }
  return out;
}

/** Lo que se guarda en la columna jsonb: sin borradores a medias ni campos extra. */
export function serializeProductFeatureVideos(videos: ProductFeatureVideo[]): ProductFeatureVideo[] {
  return videos
    .filter((v) => v.videoUrl.trim())
    .slice(0, PRODUCT_FEATURE_VIDEOS_MAX)
    .map((v) => ({
      id: v.id,
      title: v.title.trim(),
      videoUrl: v.videoUrl.trim(),
      aspectRatio: normalizeAspectRatio(v.aspectRatio),
    }));
}

export function featureVideoAspectRatio(video: Pick<ProductFeatureVideo, "aspectRatio">): number {
  return video.aspectRatio ?? PRODUCT_FEATURE_VIDEO_FALLBACK_ASPECT;
}
