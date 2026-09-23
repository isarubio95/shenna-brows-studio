import type { Area } from "react-easy-crop";

export type OptimizeVideoVariant = "desktop" | "mobile";

/**
 * Bitrate del re-encode cuando hay que volver a codificar la imagen (recorte, HEVC
 * o un lado por encima de 4K). El MP4/WebM compatible se sube tal cual: recomprimir
 * con MediaRecorder desfasaba el audio, porque la imagen salía del reloj del canvas
 * y el sonido del de Web Audio, y esos dos relojes no coinciden.
 */
const TARGET_BITRATE = 12_000_000;

/** Tope al recortar o al convertir un códec que el navegador no reproduce. */
const MAX_TRANSCODE_EDGE = 3840;

/** Por encima de esto no se recodifica: el archivo resultante no cabe con holgura en memoria. */
export const MAX_TRANSCODE_SECONDS = 180;

export interface OptimizedVideo {
  blob: Blob;
  extension: "mp4" | "webm" | "mov";
  mimeType: string;
  width: number;
  height: number;
  /** false cuando el archivo original ya cumplía y se sube tal cual. */
  transcoded: boolean;
  /** true cuando el original traía sonido y el re-encode no ha podido conservarlo. */
  audioDropped: boolean;
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

/** true cuando el navegador puede recodificar vídeo con los tiempos del original. */
export function canTranscodeVideo(): boolean {
  return typeof VideoEncoder !== "undefined" && typeof VideoFrame !== "undefined";
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

/** Dimensiones de salida: respetan la proporción del recorte y no bajan de 4K. */
function fitOutputSize(
  sourceWidth: number,
  sourceHeight: number,
): { width: number; height: number } {
  const scale = Math.min(
    1,
    MAX_TRANSCODE_EDGE / sourceWidth,
    MAX_TRANSCODE_EDGE / sourceHeight,
  );
  // Los codificadores de vídeo exigen dimensiones pares.
  const toEven = (value: number) => Math.max(2, Math.round(value * scale / 2) * 2);
  return { width: toEven(sourceWidth), height: toEven(sourceHeight) };
}

export interface VideoTranscodePlan {
  /** true cuando hay que volver a codificar la imagen. Si no, se copian los paquetes. */
  reencode: boolean;
  width?: number;
  height?: number;
  crop?: { left: number; top: number; width: number; height: number };
}

/**
 * Decide si la imagen se vuelve a codificar. El audio no entra aquí: se copia
 * con sus tiempos originales para que no se separe de la imagen.
 */
export function planVideoTranscode(args: {
  crop: Area | null;
  displayWidth: number;
  displayHeight: number;
  codec: string | null;
}): VideoTranscodePlan {
  const oversized =
    args.displayWidth > MAX_TRANSCODE_EDGE || args.displayHeight > MAX_TRANSCODE_EDGE;
  const reencode = args.crop !== null || oversized || args.codec !== "avc";
  const plan: VideoTranscodePlan = { reencode };
  if (!reencode) return plan;

  if (args.crop) {
    const size = fitOutputSize(args.crop.width, args.crop.height);
    plan.crop = {
      left: Math.max(0, args.crop.x),
      top: Math.max(0, args.crop.y),
      width: args.crop.width,
      height: args.crop.height,
    };
    plan.width = size.width;
    plan.height = size.height;
    return plan;
  }

  const size = fitOutputSize(args.displayWidth, args.displayHeight);
  if (oversized || size.width !== args.displayWidth || size.height !== args.displayHeight) {
    plan.width = size.width;
    plan.height = size.height;
  }
  return plan;
}

async function sourceBlob(source: VideoSource): Promise<Blob> {
  if (typeof source !== "string") return source;
  const response = await fetch(source);
  if (!response.ok) throw new Error("No se pudo leer el vídeo.");
  return response.blob();
}

function transcodeFailureMessage(
  discarded: { reason: string; track: { isVideoTrack: () => boolean } }[],
): string {
  const video = discarded.find((entry) => entry.track.isVideoTrack());
  if (
    video?.reason === "no_encodable_target_codec" ||
    video?.reason === "undecodable_source_codec"
  ) {
    return "Este navegador no puede procesar este vídeo. Prueba con Chrome o Edge.";
  }
  return "No se pudo procesar el vídeo.";
}

/**
 * Pasa el archivo a MP4. La imagen sólo se vuelve a codificar si hace falta
 * (recorte, HEVC o un lado enorme); el audio se copia tal cual, con los mismos
 * tiempos del original. Eso es lo que mantiene el sonido a la par de la imagen.
 */
async function transcodeVideo(
  source: VideoSource,
  crop: Area | null,
  onProgress?: (ratio: number) => void,
): Promise<OptimizedVideo> {
  if (!canTranscodeVideo()) {
    throw new Error("Este navegador no puede procesar vídeo. Prueba con Chrome o Edge.");
  }

  const {
    ALL_FORMATS,
    BlobSource,
    BufferTarget,
    Conversion,
    Input,
    Mp4OutputFormat,
    Output,
    Quality,
  } = await import("mediabunny");

  const input = new Input({
    source: new BlobSource(await sourceBlob(source)),
    formats: ALL_FORMATS,
  });

  try {
    const videoTrack = await input.getPrimaryVideoTrack();
    if (!videoTrack) throw new Error("El vídeo no tiene imagen.");

    const duration = await videoTrack.computeDuration();
    if (duration > MAX_TRANSCODE_SECONDS) {
      throw new Error(
        `El vídeo dura ${Math.round(duration)}s y el máximo para procesarlo es ${MAX_TRANSCODE_SECONDS}s.`,
      );
    }

    const displayWidth = await videoTrack.getDisplayWidth();
    const displayHeight = await videoTrack.getDisplayHeight();
    if (displayWidth < 2 || displayHeight < 2) {
      throw new Error("El vídeo no tiene un tamaño válido.");
    }

    const plan = planVideoTranscode({
      crop,
      displayWidth,
      displayHeight,
      codec: videoTrack.codec,
    });
    const primaryAudio = await input.getPrimaryAudioTrack();

    const target = new BufferTarget();
    const output = new Output({
      format: new Mp4OutputFormat({ fastStart: "in-memory" }),
      target,
    });

    const video: {
      codec?: "avc";
      quality?: InstanceType<typeof Quality>;
      allowTransformationMetadata?: boolean;
      crop?: NonNullable<VideoTranscodePlan["crop"]>;
      width?: number;
      height?: number;
      fit?: "fill";
    } = {};

    if (plan.reencode) {
      video.codec = "avc";
      video.quality = new Quality({ bitrate: TARGET_BITRATE, bitrateMode: "variable" });
      // La rotación queda pintada en los fotogramas: un MP4 con metadatos de
      // giro se ve mal en varios navegadores.
      video.allowTransformationMetadata = false;
      if (plan.width && plan.height) {
        video.width = plan.width;
        video.height = plan.height;
        video.fit = "fill";
      }
      if (plan.crop) video.crop = plan.crop;
    }

    const conversion = await Conversion.init({
      input,
      output,
      tracks: "primary",
      video,
      showWarnings: false,
    });

    const videoKept = conversion.utilizedTracks.some((track) => track.isVideoTrack());
    if (!conversion.isValid || !videoKept) {
      throw new Error(transcodeFailureMessage(conversion.discardedTracks));
    }

    conversion.onProgress = (ratio) => onProgress?.(ratio);
    await conversion.execute();

    const buffer = target.buffer;
    if (!buffer || buffer.byteLength === 0) {
      throw new Error("No se pudo procesar el vídeo.");
    }

    return {
      blob: new Blob([buffer], { type: "video/mp4" }),
      extension: "mp4",
      mimeType: "video/mp4",
      width: plan.width ?? Math.round(displayWidth),
      height: plan.height ?? Math.round(displayHeight),
      transcoded: true,
      audioDropped:
        Boolean(primaryAudio) && !conversion.utilizedTracks.some((track) => track.isAudioTrack()),
    };
  } finally {
    input.dispose();
  }
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
 * true cuando hay que pasar el archivo por el conversor: recorte, .mov
 * (HEVC/QuickTime no se ve en todos los navegadores) o una URL ya subida.
 * Un MP4 o WebM compatible se sube tal cual.
 */
export function videoNeedsTranscode(args: {
  force?: boolean;
  crop: Area | null;
  extension: "mp4" | "webm" | "mov" | null;
  isRemoteUrl: boolean;
}): boolean {
  return Boolean(args.force) || args.crop !== null || args.extension === "mov" || args.isRemoteUrl;
}

/**
 * MP4 y WebM se suben tal cual. Sólo se recodifica al recortar, al convertir un
 * .mov o al reprocesar una URL ya subida.
 */
export async function optimizeVideoForUpload(
  source: VideoSource,
  _variant: OptimizeVideoVariant,
  options: OptimizeVideoOptions = {},
): Promise<OptimizedVideo> {
  const file = typeof source === "string" ? null : source;
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
      // Se sube el archivo tal cual, así que conserva el sonido que trajera.
      audioDropped: false,
    };
  };

  /**
   * Ningún navegador declara soportar el contenedor QuickTime, y el iPhone graba
   * en HEVC por defecto: un .mov puede subirse bien desde un equipo que sabe
   * decodificarlo y luego no verse en el del visitante. Al bucket sólo MP4 o WebM.
   */
  const extension = file ? sourceExtension(file) : null;
  const unsafeContainer = extension === "mov";
  const mustTranscode = videoNeedsTranscode({
    force: options.force,
    crop,
    extension,
    isRemoteUrl: file === null,
  });

  if (!mustTranscode) return passthrough();

  if (unsafeContainer && probe.duration > MAX_TRANSCODE_SECONDS) {
    throw new Error(
      `Este .mov dura ${Math.round(probe.duration)}s y por encima de ${MAX_TRANSCODE_SECONDS}s no se puede convertir. Pásalo a MP4 y vuelve a subirlo.`,
    );
  }

  if (!canTranscodeVideo()) {
    // Sin soporte de re-encode preferimos subir el original a bloquear al admin.
    if (crop) {
      throw new Error("Este navegador no puede recortar vídeo. Prueba con Chrome o Edge.");
    }
    return passthrough();
  }

  return transcodeVideo(source, crop, options.onProgress);
}

/**
 * Extrae un fotograma como WebP (JPEG de reserva) para usarlo de póster.
 * `source` puede ser el archivo local o una URL ya subida.
 */
export async function captureVideoPosterBlob(
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
