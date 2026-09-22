import type { Area } from "react-easy-crop";

export type OptimizeVideoVariant = "desktop" | "mobile";

/** Mismo criterio que las imágenes: el ancho manda, la altura sólo pone techo. */
const MAX_WIDTH: Record<OptimizeVideoVariant, number> = {
  desktop: 1920,
  mobile: 1080,
};

const MAX_HEIGHT: Record<OptimizeVideoVariant, number> = {
  desktop: 1920,
  mobile: 1920,
};

/** Bitrate objetivo del re-encode. */
const TARGET_BITRATE: Record<OptimizeVideoVariant, number> = {
  desktop: 4_500_000,
  mobile: 2_200_000,
};

const TARGET_FPS = 30;

/** Un vídeo por debajo de esto ya es lo bastante ligero para no tocarlo. */
const ALWAYS_PASSTHROUGH_BYTES = 2 * 1024 * 1024;

/** El re-encode va a velocidad de reproducción: por encima de esto la espera es inasumible. */
export const MAX_TRANSCODE_SECONDS = 180;

/** Tamaño máximo del archivo de origen que aceptamos procesar. */
export const VIDEO_SOURCE_MAX_BYTES = 200 * 1024 * 1024;

/**
 * Tope del archivo que acaba en el bucket. Va por debajo del límite por defecto
 * de Supabase Storage (50 MB) para que el fallo se vea aquí y no como un error
 * opaco de la subida.
 */
export const VIDEO_UPLOAD_MAX_BYTES = 45 * 1024 * 1024;

export interface OptimizedVideo {
  blob: Blob;
  extension: "mp4" | "webm" | "mov";
  mimeType: string;
  width: number;
  height: number;
  /** false cuando el archivo original ya cumplía y se sube tal cual. */
  transcoded: boolean;
}

/** Origen de un vídeo: el archivo recién elegido o una URL ya subida. */
export type VideoSource = File | string;

export interface VideoProbe {
  width: number;
  height: number;
  duration: number;
}

export interface OptimizeVideoOptions {
  /** Área de recorte en píxeles del vídeo original (la que devuelve react-easy-crop). */
  crop?: Area | null;
  /** Progreso del re-encode, de 0 a 1. */
  onProgress?: (ratio: number) => void;
  /** Fuerza el re-encode aunque el original ya cumpla. */
  force?: boolean;
}

const MIME_CANDIDATES = [
  "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
  "video/mp4;codecs=avc1.42E01E",
  "video/mp4",
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm;codecs=vp9",
  "video/webm",
];

function pickRecorderMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  return MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}

/** true cuando el navegador puede recortar y recomprimir vídeo por su cuenta. */
export function canTranscodeVideo(): boolean {
  if (typeof document === "undefined") return false;
  if (pickRecorderMimeType() === null) return false;
  const canvas = document.createElement("canvas");
  return typeof canvas.captureStream === "function";
}

function extensionForMimeType(mimeType: string): "mp4" | "webm" {
  return mimeType.startsWith("video/mp4") ? "mp4" : "webm";
}

/** MediaRecorder exige los códecs en el mime; el objeto almacenado no los quiere. */
function baseMimeType(mimeType: string): string {
  return mimeType.split(";", 1)[0]!.trim();
}

function loadVideoElement(src: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "auto";
    video.playsInline = true;
    video.crossOrigin = "anonymous";
    const fail = () => reject(new Error("No se pudo leer el vídeo."));
    video.onerror = fail;
    video.onloadedmetadata = () => {
      // Safari da duration = Infinity hasta que se busca dentro del archivo.
      if (!Number.isFinite(video.duration)) {
        video.currentTime = 1e101;
        video.onseeked = () => {
          video.onseeked = null;
          video.currentTime = 0;
          resolve(video);
        };
        return;
      }
      resolve(video);
    };
    video.src = src;
  });
}

async function withVideoElement<T>(
  source: VideoSource,
  fn: (video: HTMLVideoElement) => Promise<T>,
): Promise<T> {
  const isFile = typeof source !== "string";
  const url = isFile ? URL.createObjectURL(source) : source;
  try {
    const video = await loadVideoElement(url);
    try {
      return await fn(video);
    } finally {
      video.pause();
      video.removeAttribute("src");
      video.load();
    }
  } finally {
    if (isFile) URL.revokeObjectURL(url);
  }
}

export async function probeVideo(source: VideoSource): Promise<VideoProbe> {
  return withVideoElement(source, async (video) => ({
    width: video.videoWidth,
    height: video.videoHeight,
    duration: Number.isFinite(video.duration) ? video.duration : 0,
  }));
}

/** Dimensiones de salida: respetan la proporción del recorte y los topes del dispositivo. */
function fitOutputSize(
  sourceWidth: number,
  sourceHeight: number,
  variant: OptimizeVideoVariant,
): { width: number; height: number } {
  const scale = Math.min(
    1,
    MAX_WIDTH[variant] / sourceWidth,
    MAX_HEIGHT[variant] / sourceHeight,
  );
  // Los codificadores de vídeo exigen dimensiones pares.
  const toEven = (value: number) => Math.max(2, Math.round(value * scale / 2) * 2);
  return { width: toEven(sourceWidth), height: toEven(sourceHeight) };
}

/**
 * Captura el audio del elemento sin sacarlo por los altavoces: el grafo de Web Audio
 * termina en un destino de MediaStream y nunca se conecta a `ctx.destination`.
 */
function captureSilentAudioTrack(
  video: HTMLVideoElement,
): { track: MediaStreamTrack | null; close: () => void } {
  const AudioCtx =
    typeof window === "undefined"
      ? undefined
      : window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return { track: null, close: () => {} };

  try {
    const ctx = new AudioCtx();
    const source = ctx.createMediaElementSource(video);
    const destination = ctx.createMediaStreamDestination();
    source.connect(destination);
    const track = destination.stream.getAudioTracks()[0] ?? null;
    return {
      track,
      close: () => {
        try {
          source.disconnect();
        } catch {
          /* ya desconectado */
        }
        void ctx.close();
      },
    };
  } catch {
    return { track: null, close: () => {} };
  }
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  crop: Area | null,
  outWidth: number,
  outHeight: number,
) {
  if (crop) {
    ctx.drawImage(
      video,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      outWidth,
      outHeight,
    );
  } else {
    ctx.drawImage(video, 0, 0, outWidth, outHeight);
  }
}

async function transcodeVideo(
  source: VideoSource,
  variant: OptimizeVideoVariant,
  crop: Area | null,
  onProgress?: (ratio: number) => void,
): Promise<OptimizedVideo> {
  const mimeType = pickRecorderMimeType();
  if (!mimeType) {
    throw new Error("Este navegador no puede procesar vídeo. Sube un archivo ya optimizado.");
  }

  return withVideoElement(source, async (video) => {
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    if (duration > MAX_TRANSCODE_SECONDS) {
      throw new Error(
        `El vídeo dura ${Math.round(duration)}s y el máximo para procesarlo es ${MAX_TRANSCODE_SECONDS}s.`,
      );
    }

    const sourceWidth = crop ? Math.round(crop.width) : video.videoWidth;
    const sourceHeight = crop ? Math.round(crop.height) : video.videoHeight;
    if (sourceWidth < 2 || sourceHeight < 2) {
      throw new Error("El vídeo no tiene un tamaño válido.");
    }

    const { width, height } = fitOutputSize(sourceWidth, sourceHeight, variant);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("No se pudo procesar el vídeo.");

    const stream = canvas.captureStream(TARGET_FPS);
    const audio = captureSilentAudioTrack(video);
    if (audio.track) stream.addTrack(audio.track);

    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: TARGET_BITRATE[variant],
      audioBitsPerSecond: 128_000,
    });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };

    const recorded = new Promise<void>((resolve, reject) => {
      recorder.onstop = () => resolve();
      recorder.onerror = () => reject(new Error("Falló la compresión del vídeo."));
    });

    let stopped = false;
    const stop = () => {
      if (stopped) return;
      stopped = true;
      if (recorder.state !== "inactive") recorder.stop();
      stream.getTracks().forEach((track) => track.stop());
    };

    // El primer fotograma debe estar en el canvas antes de arrancar la grabación.
    video.currentTime = 0;
    await new Promise<void>((resolve) => {
      if (video.readyState >= 2) {
        resolve();
        return;
      }
      video.onloadeddata = () => resolve();
    });
    drawFrame(ctx, video, crop, width, height);

    // El fin de la reproducción cierra la grabación, así que se engancha antes
    // de arrancarla: un vídeo muy corto podría terminar en cuanto empieza.
    video.onended = () => {
      drawFrame(ctx, video, crop, width, height);
      onProgress?.(1);
      // Un respiro para que el último fotograma entre en la grabación.
      setTimeout(stop, 120);
    };

    recorder.start();

    try {
      await video.play();
    } catch {
      // La política de autoplay sólo deja arrancar en mudo si se ha perdido el
      // gesto del usuario. La pista de audio sigue en la grabación, muda.
      video.muted = true;
      await video.play();
    }

    const supportsFrameCallback = typeof video.requestVideoFrameCallback === "function";
    const pump = () => {
      if (video.ended || stopped) return;
      drawFrame(ctx, video, crop, width, height);
      if (duration > 0) onProgress?.(Math.min(1, video.currentTime / duration));
      if (supportsFrameCallback) {
        video.requestVideoFrameCallback(pump);
      } else {
        requestAnimationFrame(pump);
      }
    };
    pump();

    // Si la reproducción se atasca, se cierra igualmente en vez de dejar el
    // admin con el indicador de carga para siempre.
    const watchdog = setTimeout(stop, (duration + 10) * 2000);

    try {
      await recorded;
    } finally {
      clearTimeout(watchdog);
      audio.close();
    }

    const blob = new Blob(chunks, { type: mimeType });
    if (blob.size === 0) {
      throw new Error("No se pudo comprimir el vídeo.");
    }

    return {
      blob,
      extension: extensionForMimeType(mimeType),
      mimeType: baseMimeType(mimeType),
      width,
      height,
      transcoded: true,
    };
  });
}

/** Tamaño por encima del cual el original no cumple ya el bitrate objetivo. */
function passthroughSizeLimit(duration: number, variant: OptimizeVideoVariant): number {
  if (duration <= 0) return ALWAYS_PASSTHROUGH_BYTES;
  return Math.max(ALWAYS_PASSTHROUGH_BYTES, (duration * TARGET_BITRATE[variant]) / 8 * 1.25);
}

function sourceExtension(file: File): "mp4" | "webm" | "mov" {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName === "webm") return "webm";
  if (fromName === "mov") return "mov";
  if (fromName === "mp4" || fromName === "m4v") return "mp4";
  if (file.type === "video/webm") return "webm";
  if (file.type === "video/quicktime") return "mov";
  return "mp4";
}

function sourceMimeType(file: File, extension: "mp4" | "webm" | "mov"): string {
  if (file.type.startsWith("video/")) return file.type;
  return extension === "mov" ? "video/quicktime" : `video/${extension}`;
}

/**
 * Estrategia híbrida: si el vídeo ya está dentro del objetivo del dispositivo y no
 * hay recorte, se sube tal cual (sin pérdida). Si no, se recorta y recomprime.
 */
export async function optimizeVideoForUpload(
  source: VideoSource,
  variant: OptimizeVideoVariant,
  options: OptimizeVideoOptions = {},
): Promise<OptimizedVideo> {
  const file = typeof source === "string" ? null : source;
  if (file && file.size > VIDEO_SOURCE_MAX_BYTES) {
    throw new Error(
      `El archivo pesa ${Math.round(file.size / (1024 * 1024))} MB y el máximo es ${Math.round(VIDEO_SOURCE_MAX_BYTES / (1024 * 1024))} MB.`,
    );
  }

  const crop = options.crop ?? null;
  const probe = await probeVideo(source);

  const passthrough = (): OptimizedVideo => {
    if (!file) {
      throw new Error("Este navegador no puede procesar vídeo. Prueba con Chrome o Edge.");
    }
    const extension = sourceExtension(file);
    return {
      blob: file,
      extension,
      mimeType: sourceMimeType(file, extension),
      width: probe.width,
      height: probe.height,
      transcoded: false,
    };
  };

  const needsResize = probe.width > MAX_WIDTH[variant] || probe.height > MAX_HEIGHT[variant];
  const needsShrink = file !== null && file.size > passthroughSizeLimit(probe.duration, variant);
  const mustTranscode =
    Boolean(options.force) || crop !== null || needsResize || needsShrink || file === null;

  if (!mustTranscode) return passthrough();

  if (!canTranscodeVideo()) {
    // Sin soporte de re-encode preferimos subir el original a bloquear al admin.
    if (crop) {
      throw new Error("Este navegador no puede recortar vídeo. Prueba con Chrome o Edge.");
    }
    return passthrough();
  }

  return transcodeVideo(source, variant, crop, options.onProgress);
}

/**
 * Extrae un fotograma como WebP (JPEG de reserva) para usarlo de póster.
 * `source` puede ser el archivo local o una URL ya subida.
 */export async function captureVideoPosterBlob(
  source: VideoSource,
  atSecond = 0.1,
): Promise<{ blob: Blob; extension: "webp" | "jpg"; mimeType: string }> {
  return withVideoElement(source, async (video) => {
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    const target = duration > 0 ? Math.min(Math.max(atSecond, 0), Math.max(0, duration - 0.05)) : 0;

    await new Promise<void>((resolve, reject) => {
      video.onseeked = () => resolve();
      video.onerror = () => reject(new Error("No se pudo leer el vídeo."));
      if (Math.abs(video.currentTime - target) < 0.01 && video.readyState >= 2) {
        resolve();
        return;
      }
      video.currentTime = target;
    });

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx || canvas.width === 0 || canvas.height === 0) {
      throw new Error("No se pudo generar la portada del vídeo.");
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const toBlob = (type: string, quality: number) =>
      new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

    const webp = await toBlob("image/webp", 0.82);
    if (webp && webp.size > 0) {
      return { blob: webp, extension: "webp" as const, mimeType: "image/webp" };
    }
    const jpeg = await toBlob("image/jpeg", 0.82);
    if (!jpeg || jpeg.size === 0) {
      throw new Error("No se pudo generar la portada del vídeo.");
    }
    return { blob: jpeg, extension: "jpg" as const, mimeType: "image/jpeg" };
  });
}
