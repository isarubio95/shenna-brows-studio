import type { Area } from "react-easy-crop";
import { supabase } from "@/integrations/supabase/client";
import { isVideoFile, posterPathForVideoPath } from "@/lib/media-url";
import {
  optimizeImageForUpload,
  type OptimizeImageVariant,
} from "@/lib/optimize-image-upload";
import {
  captureVideoPosterBlob,
  optimizeVideoForUpload,
  type VideoSource,
} from "@/lib/optimize-video-upload";

export const STORAGE_URL = "https://vanhsuisvxvclxdgutaw.supabase.co";
export const CAMPAIGN_BUCKET = "campaign-images";
export const PRODUCT_BUCKET = "product-images";

export type MediaVariant = OptimizeImageVariant;

export function publicStorageUrl(bucket: string, filePath: string): string {
  return `${STORAGE_URL}/storage/v1/object/public/${bucket}/${filePath}`;
}

export interface UploadMediaOptions {
  bucket: string;
  /** Prefijo del nombre del archivo; se le añade la marca de tiempo y la extensión. */
  pathPrefix: string;
  /** Tamaño objetivo: escritorio 1920px, móvil 1080px. */
  variant: MediaVariant;
  /** Recorte en píxeles del original, tal como lo devuelve react-easy-crop. */
  crop?: Area | null;
  /** Progreso del re-encode de vídeo, de 0 a 1. Las imágenes no lo emiten. */
  onProgress?: (ratio: number) => void;
}

export interface UploadedMedia {
  url: string;
  kind: "image" | "video";
  /** Sólo en vídeo: URL del fotograma de portada subido junto al archivo. */
  posterUrl?: string;
  /** Sólo en vídeo: false cuando el original ya cumplía y se subió sin recomprimir. */
  transcoded?: boolean;
  /** Sólo en vídeo: true cuando el original traía sonido y el re-encode lo perdió. */
  audioDropped?: boolean;
  /** Sólo en vídeo: dimensiones del archivo subido, para reservar su hueco al pintarlo. */
  width?: number;
  height?: number;
  extension: string;
}

async function uploadBlob(bucket: string, filePath: string, blob: Blob, contentType: string) {
  const { error } = await supabase.storage.from(bucket).upload(filePath, blob, {
    upsert: true,
    contentType,
  });
  if (!error) return;
  if (/exceeded the maximum allowed size|payload too large|maximum size/i.test(error.message)) {
    throw new Error(
      "El archivo supera el límite de Storage. Si pesa más de 50 MB, hay que subir el plan de Supabase (el Free no admite más).",
    );
  }
  throw error;
}

/**
 * Sube un vídeo sin recomprimirlo (salvo recorte o conversión de .mov) y deja el
 * póster al lado, con un nombre derivado del propio vídeo (ver `posterPathForVideoPath`).
 */
export async function uploadVideoMedia(
  source: VideoSource,
  options: UploadMediaOptions,
): Promise<UploadedMedia> {
  const { bucket, pathPrefix, variant, crop, onProgress } = options;
  const optimized = await optimizeVideoForUpload(source, variant, { crop, onProgress });
  const filePath = `${pathPrefix}-${Date.now()}.${optimized.extension}`;
  await uploadBlob(bucket, filePath, optimized.blob, optimized.mimeType);

  let posterUrl: string | undefined;
  try {
    const poster = await captureVideoPosterBlob(
      new File([optimized.blob], filePath, { type: optimized.mimeType }),
    );
    const posterPath = posterPathForVideoPath(filePath);
    await uploadBlob(bucket, posterPath, poster.blob, poster.mimeType);
    posterUrl = publicStorageUrl(bucket, posterPath);
  } catch {
    // Sin póster el navegador sigue pintando el primer fotograma del vídeo.
  }

  return {
    url: publicStorageUrl(bucket, filePath),
    kind: "video",
    posterUrl,
    transcoded: optimized.transcoded,
    audioDropped: optimized.audioDropped,
    width: optimized.width,
    height: optimized.height,
    extension: optimized.extension,
  };
}

/**
 * Sube una imagen (optimizada) o un vídeo (sin recomprimir, salvo recorte o .mov)
 * al bucket indicado.
 */
export async function uploadMedia(file: File, options: UploadMediaOptions): Promise<UploadedMedia> {
  if (isVideoFile(file)) {
    return uploadVideoMedia(file, options);
  }

  const optimized = await optimizeImageForUpload(file, options.variant);
  const filePath = `${options.pathPrefix}-${Date.now()}.${optimized.extension}`;
  await uploadBlob(options.bucket, filePath, optimized.blob, optimized.mimeType);

  return {
    url: publicStorageUrl(options.bucket, filePath),
    kind: "image",
    extension: optimized.extension,
  };
}

/** Texto de confirmación para el toast, según lo que haya hecho el optimizador. */
export function uploadResultDescription(result: UploadedMedia, variantLabel: string): string {
  if (result.kind === "image") {
    return `Versión ${variantLabel} optimizada (${result.extension.toUpperCase()}).`;
  }
  const base = result.transcoded
    ? `Versión ${variantLabel} recodificada (${result.extension.toUpperCase()}). Guarda para publicarla.`
    : `Versión ${variantLabel} subida sin recomprimir. Guarda para publicarla.`;
  return [base, videoUploadNotes(result)].filter(Boolean).join(" ");
}

/**
 * Lo que el admin necesita saber del archivo que acaba de quedar subido. Vacío
 * cuando no hay nada que advertir, que es el caso corriente.
 */
export function videoUploadNotes(result: UploadedMedia): string {
  const notes: string[] = [];
  if (result.audioDropped) {
    notes.push(
      "El vídeo se ha quedado sin sonido al recomprimirlo: súbelo ya optimizado si lo necesitas con audio.",
    );
  }
  if (result.transcoded && result.extension === "webm") {
    // Este navegador no sabe grabar MP4 con AAC, y un MP4 con Opus sale mudo en iOS.
    notes.push("Se ha guardado en WebM para conservar el sonido: los iPhone con iOS anterior a 17.4 no lo reproducen.");
  }
  return notes.join(" ");
}
