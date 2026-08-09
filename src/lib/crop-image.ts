import type { Area } from "react-easy-crop";

function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (url.startsWith("http://") || url.startsWith("https://")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar la imagen para recortar."));
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
 * Genera un blob WebP (o JPEG) a partir del área recortada de react-easy-crop.
 */
export async function getCroppedImageBlob(
  imageSrc: string,
  pixelCrop: Area,
  maxSize = 1600,
): Promise<{ blob: Blob; extension: "webp" | "jpg"; mimeType: string }> {
  const image = await loadImageFromUrl(imageSrc);
  const cropW = Math.max(1, Math.round(pixelCrop.width));
  const cropH = Math.max(1, Math.round(pixelCrop.height));

  const scale = Math.min(1, maxSize / Math.max(cropW, cropH));
  const outW = Math.max(1, Math.round(cropW * scale));
  const outH = Math.max(1, Math.round(cropH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo procesar el recorte.");

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outW,
    outH,
  );

  const webpBlob = await canvasToBlob(canvas, "image/webp", 0.88);
  if (webpBlob && webpBlob.size > 0) {
    return { blob: webpBlob, extension: "webp", mimeType: "image/webp" };
  }

  const jpegBlob = await canvasToBlob(canvas, "image/jpeg", 0.88);
  if (!jpegBlob || jpegBlob.size === 0) {
    throw new Error("No se pudo generar la imagen recortada.");
  }
  return { blob: jpegBlob, extension: "jpg", mimeType: "image/jpeg" };
}
