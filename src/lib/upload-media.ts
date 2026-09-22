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
  VIDEO_UPLOAD_MAX_BYTES,
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
  if (error) throw error;
}

/**
 * Sube un vídeo aplicando la optimización del dispositivo y deja el póster al lado,
 * con un nombre derivado del propio vídeo (ver `posterPathForVideoPath`).
 */
export async function uploadVideoMedia(
  source: VideoSource,
  options: UploadMediaOptions,
): Promise<UploadedMedia> {
  const { bucket, pathPrefix, variant, crop, onProgress } = options;
  const optimized = await optimizeVideoForUpload(source, variant, { crop, onProgress });
  if (optimized.blob.size > VIDEO_UPLOAD_MAX_BYTES) {
    const mb = Math.round(optimized.blob.size / (1024 * 1024));
    throw new Error(
      `El vídeo ocupa ${mb} MB tras optimizarlo y el máximo son ${Math.round(VIDEO_UPLOAD_MAX_BYTES / (1024 * 1024))} MB. Acórtalo o súbelo ya comprimido.`,
    );
  }
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
    width: optimized.width,
    height: optimized.height,
    extension: optimized.extension,
  };
}

/**
 * Sube una imagen o un vídeo al bucket indicado aplicando la misma optimización
 * por dispositivo en ambos casos.
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
  return result.transcoded
    ? `Versión ${variantLabel} recomprimida (${result.extension.toUpperCase()}). Guarda para publicarla.`
    : `Versión ${variantLabel} lista, ya estaba optimizada. Guarda para publicarla.`;
}
