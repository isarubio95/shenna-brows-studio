export const BANNER_VIDEO_MAX_BYTES = 40 * 1024 * 1024;

export const BANNER_MEDIA_ACCEPT =
  "image/*,video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov";

/** Mismo conjunto para la galería de producto: fotos y vídeos conviven en ella. */
export const PRODUCT_MEDIA_ACCEPT = BANNER_MEDIA_ACCEPT;

const VIDEO_PATH_EXT_RE = /\.(mp4|webm|mov|m4v|ogv)$/i;

export function isVideoFile(file: File): boolean {
  return file.type.startsWith("video/") || /\.(mp4|webm|mov|m4v)$/i.test(file.name);
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

export function isBannerMediaFile(file: File): boolean {
  return isImageFile(file) || isVideoFile(file);
}

export function pickDroppedMediaFile(files: FileList | null | undefined): File | undefined {
  return Array.from(files ?? []).find(isBannerMediaFile);
}

export function videoFileExtension(file: File): "mp4" | "webm" | "mov" {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName === "mp4" || fromName === "webm" || fromName === "mov") return fromName;
  if (file.type === "video/webm") return "webm";
  if (file.type === "video/quicktime") return "mov";
  return "mp4";
}

export function videoContentType(file: File, ext: ReturnType<typeof videoFileExtension>): string {
  if (file.type.startsWith("video/")) return file.type;
  return ext === "mov" ? "video/quicktime" : `video/${ext}`;
}

/** Detecta si una URL de banner (hero/campaña) apunta a un vídeo. */
export function isVideoMediaUrl(url: string | null | undefined): boolean {
  const trimmed = (url ?? "").trim();
  if (!trimmed) return false;

  try {
    const path = trimmed.startsWith("/")
      ? trimmed.split(/[?#]/, 1)[0]
      : new URL(trimmed).pathname;
    return VIDEO_PATH_EXT_RE.test(path);
  } catch {
    return VIDEO_PATH_EXT_RE.test(trimmed.split(/[?#]/, 1)[0] ?? "");
  }
}

/**
 * Ruta del póster que se sube junto a cada vídeo. Se deriva del nombre del propio
 * vídeo para no tener que guardar una URL extra en la configuración.
 */
export function posterPathForVideoPath(videoPath: string): string {
  return `${videoPath.replace(VIDEO_PATH_EXT_RE, "")}.poster.webp`;
}

/** Póster asociado a una URL de vídeo, o `undefined` si la URL no es un vídeo. */
export function posterUrlForVideoUrl(url: string | null | undefined): string | undefined {
  const trimmed = (url ?? "").trim();
  if (!trimmed || !isVideoMediaUrl(trimmed)) return undefined;
  const [base, suffix = ""] = splitUrlSuffix(trimmed);
  return `${base.replace(VIDEO_PATH_EXT_RE, "")}.poster.webp${suffix}`;
}

function splitUrlSuffix(url: string): [string, string] {
  const index = url.search(/[?#]/);
  if (index === -1) return [url, ""];
  return [url.slice(0, index), url.slice(index)];
}
