export type OptimizeImageVariant = "desktop" | "mobile";

const MAX_WIDTH: Record<OptimizeImageVariant, number> = {
  desktop: 1920,
  mobile: 1080,
};

const QUALITY = 0.82;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen."));
    };
    img.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

/**
 * Redimensiona y convierte a WebP (JPEG si el navegador no soporta WebP).
 */
export async function optimizeImageForUpload(
  file: File,
  variant: OptimizeImageVariant,
): Promise<{ blob: Blob; extension: "webp" | "jpg"; mimeType: string }> {
  if (!file.type.startsWith("image/")) {
    throw new Error("El archivo debe ser una imagen.");
  }

  const img = await loadImage(file);
  const maxWidth = MAX_WIDTH[variant];
  const scale = img.width > maxWidth ? maxWidth / img.width : 1;
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("No se pudo procesar la imagen.");
  }
  ctx.drawImage(img, 0, 0, width, height);

  const webpBlob = await canvasToBlob(canvas, "image/webp", QUALITY);
  if (webpBlob && webpBlob.size > 0) {
    return { blob: webpBlob, extension: "webp", mimeType: "image/webp" };
  }

  const jpegBlob = await canvasToBlob(canvas, "image/jpeg", QUALITY);
  if (!jpegBlob || jpegBlob.size === 0) {
    throw new Error("No se pudo comprimir la imagen.");
  }
  return { blob: jpegBlob, extension: "jpg", mimeType: "image/jpeg" };
}
