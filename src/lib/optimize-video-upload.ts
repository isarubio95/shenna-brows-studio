import type { Area } from "react-easy-crop";

export type OptimizeVideoVariant = "desktop" | "mobile";

/**
 * Bitrate del re-encode cuando no queda más remedio (recorte o .mov). El MP4/WebM
 * original se sube tal cual: recomprimir con MediaRecorder era lo que bajaba la calidad.
 */
const TARGET_BITRATE = 12_000_000;

const TARGET_FPS = 60;

/** Tope del canvas al recortar o convertir .mov; el original no se reescala. */
const MAX_TRANSCODE_EDGE = 3840;

/** El re-encode va a velocidad de reproducción: por encima de esto la espera es inasumible. */
export const MAX_TRANSCODE_SECONDS = 180;

/** Tamaño máximo del archivo de origen que aceptamos subir. */
export const VIDEO_SOURCE_MAX_BYTES = 200 * 1024 * 1024;

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

/**
 * Con sonido el MP4 sólo vale si el navegador sabe meter AAC: pedirle un MP4 «a
 * secas» hace que Chrome muxee Opus dentro del MP4, y Safari y iOS ignoran esa
 * pista (se ve el vídeo, pero mudo). Si no hay AAC, mejor un WebM honesto, cuyo
 * Opus sí reproduce todo el que abre el contenedor.
 */
const MIME_CANDIDATES_WITH_AUDIO = [
  "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
];

/** Sin sonido que preservar, el MP4 es lo que reproduce cualquier navegador. */
const MIME_CANDIDATES_SILENT = [
  "video/mp4;codecs=avc1.42E01E",
  "video/mp4",
  "video/webm;codecs=vp9",
  "video/webm",
];

function pickRecorderMimeType(withAudio = false): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  const supported = (list: string[]) => list.find((type) => MediaRecorder.isTypeSupported(type));
  // Sin ningún contenedor con audio se graba mudo antes que no grabar nada.
  return (withAudio ? supported(MIME_CANDIDATES_WITH_AUDIO) : undefined)
    ?? supported(MIME_CANDIDATES_SILENT)
    ?? null;
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

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Sin gesto del usuario `resume()` no resuelve nunca, así que se corre contra el reloj. */
const AUDIO_RESUME_TIMEOUT_MS = 1500;

interface CapturedAudio {
  /** null cuando el navegador no da Web Audio o el contexto no llegó a arrancar. */
  track: MediaStreamTrack | null;
  close: () => void;
}

/**
 * Captura el audio del elemento sin sacarlo por los altavoces: el grafo de Web Audio
 * termina en un destino de MediaStream y nunca se conecta a `ctx.destination`.
 *
 * Un `AudioContext` recién creado nace suspendido y, suspendido, no procesa nada:
 * la pista saldría muda. De ahí el `resume()`, que la política de reproducción
 * concede porque el admin viene de pulsar el selector de archivos.
 */
async function captureAudioTrack(video: HTMLVideoElement): Promise<CapturedAudio> {
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
    const close = () => {
      try {
        source.disconnect();
      } catch {
        /* ya desconectado */
      }
      void ctx.close();
    };

    if (ctx.state === "suspended") {
      await Promise.race([
        ctx.resume().catch(() => {
          /* el estado se comprueba abajo */
        }),
        wait(AUDIO_RESUME_TIMEOUT_MS),
      ]);
    }
    // Sigue suspendido: grabaríamos silencio, así que mejor un archivo sin pista.
    if (ctx.state !== "running") {
      close();
      return { track: null, close: () => {} };
    }

    return { track: destination.stream.getAudioTracks()[0] ?? null, close };
  } catch {
    return { track: null, close: () => {} };
  }
}

/**
 * ¿Trae sonido el original? Sólo cuenta la confirmación: ante la duda se graba en
 * MP4 mudo, que es lo que reproduce cualquier navegador, en vez de arriesgar un
 * WebM por un audio que quizá ni exista.
 *
 * `webkitAudioDecodedByteCount` (Chrome) sólo sube cuando ya se ha decodificado
 * audio, de ahí la reproducción de sondeo previa.
 */
function sourceHasAudio(video: HTMLVideoElement): boolean {
  const probe = video as HTMLVideoElement & {
    mozHasAudio?: boolean;
    audioTracks?: { length: number };
    webkitAudioDecodedByteCount?: number;
  };
  if (typeof probe.mozHasAudio === "boolean") return probe.mozHasAudio;
  if (probe.audioTracks && typeof probe.audioTracks.length === "number") {
    return probe.audioTracks.length > 0;
  }
  return (probe.webkitAudioDecodedByteCount ?? 0) > 0;
}

/** Hay archivos en los que el salto no confirma nunca, de ahí el tope de espera. */
const SEEK_TIMEOUT_MS = 1000;

function seekToStart(video: HTMLVideoElement): Promise<void> {
  if (video.currentTime === 0) return Promise.resolve();
  const seeked = new Promise<void>((resolve) => {
    video.onseeked = () => {
      video.onseeked = null;
      resolve();
    };
    video.currentTime = 0;
  });
  return Promise.race([seeked, wait(SEEK_TIMEOUT_MS)]);
}

/**
 * Espera a que haya fotograma que pintar. Se sondea en vez de escuchar `loadeddata`
 * porque ese evento ya se ha disparado antes del sondeo y no vuelve a repetirse:
 * esperarlo dejaba la subida colgada para siempre.
 */
async function waitForFrameData(video: HTMLVideoElement): Promise<void> {
  const deadline = performance.now() + FRAME_DATA_TIMEOUT_MS;
  while (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA && performance.now() < deadline) {
    await wait(50);
  }
}

const FRAME_DATA_TIMEOUT_MS = 3000;

/** Lo que se reproduce para que el decodificador toque el audio, y su tope de espera. */
const SNIFF_PLAY_MS = 250;
const SNIFF_TIMEOUT_MS = 3000;

/**
 * Reproduce un instante para saber si el archivo trae sonido y si la política de
 * reproducción nos deja arrancarlo sin silenciar. No se oye nada: el audio ya va
 * enrutado al grafo de Web Audio.
 */
async function sniffSource(video: HTMLVideoElement): Promise<{ playable: boolean; hasAudio: boolean }> {
  let playable = true;
  try {
    // El sondeo tampoco puede colgarse: si `play()` no resuelve, se da por perdido.
    await Promise.race([video.play(), wait(SNIFF_TIMEOUT_MS)]);
    await wait(SNIFF_PLAY_MS);
  } catch {
    playable = false;
  }
  const hasAudio = sourceHasAudio(video);
  video.pause();
  await seekToStart(video);
  return { playable, hasAudio };
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
  crop: Area | null,
  onProgress?: (ratio: number) => void,
): Promise<OptimizedVideo> {
  if (!pickRecorderMimeType()) {
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

    const { width, height } = fitOutputSize(sourceWidth, sourceHeight);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("No se pudo procesar el vídeo.");

    // El grafo de audio se monta antes del sondeo para que éste no se oiga.
    const audio = await captureAudioTrack(video);
    const sniff = await sniffSource(video);
    // Sin poder reproducir sin silenciar no hay sonido que grabar (ni que prometer).
    const keepAudio = Boolean(audio.track) && sniff.hasAudio && sniff.playable;
    if (!keepAudio) {
      // Sin grafo que se quede el audio, silenciar es lo que garantiza que el
      // re-encode no salga por los altavoces del admin.
      video.muted = true;
      audio.close();
    }

    const mimeType = pickRecorderMimeType(keepAudio)!;

    const stream = canvas.captureStream(TARGET_FPS);
    if (keepAudio && audio.track) stream.addTrack(audio.track);

    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: TARGET_BITRATE,
      ...(keepAudio ? { audioBitsPerSecond: 192_000 } : {}),
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
    await waitForFrameData(video);
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
      // Sin gesto del usuario la política de reproducción sólo deja arrancar en
      // mudo. El sondeo ya lo detectó, así que la grabación va sin pista de audio.
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
      if (keepAudio) audio.close();
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
      audioDropped: sniff.hasAudio && !keepAudio,
    };
  });
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
 * true cuando hay que recodificar: recorte, .mov (HEVC/QuickTime no se ve en todos
 * los navegadores) o una URL ya subida. El tamaño y la resolución no cuentan:
 * recomprimir era lo que bajaba la calidad.
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
