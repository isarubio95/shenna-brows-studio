/**
 * Proporción real (ancho/alto) de los vídeos de fondo.
 *
 * Los banners reservan su hueco con una proporción fija (la misma a la que el
 * admin recorta las fotos), pero un vídeo no pasa por el recortador: se sube tal
 * cual. Si el archivo es más estrecho que el hueco, `object-cover` lo recorta por
 * arriba y por abajo. Leyendo los metadatos del propio archivo podemos darle al
 * banner la proporción del vídeo y enseñarlo entero.
 *
 * La caché es de módulo para que los dos sitios que preguntan por el mismo vídeo
 * (la web y la vista previa del admin) compartan una sola lectura.
 */
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { isVideoMediaUrl } from "@/lib/media-url";

const MIN_ASPECT = 0.2;
const MAX_ASPECT = 5;

const cache = new Map<string, number>();
const pending = new Map<string, Promise<void>>();
const listeners = new Set<() => void>();

const normalize = (width: number, height: number): number | null => {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  const ratio = Math.round((width / height) * 10000) / 10000;
  if (ratio < MIN_ASPECT || ratio > MAX_ASPECT) return null;
  return ratio;
};

/** Apunta la proporción que ya conoce un `<video>` pintado, sin pedir nada más. */
export function rememberVideoAspectRatio(
  src: string | null | undefined,
  width: number,
  height: number,
): void {
  const url = (src ?? "").trim();
  if (!url) return;
  const ratio = normalize(width, height);
  if (ratio === null || cache.get(url) === ratio) return;
  cache.set(url, ratio);
  for (const listener of listeners) listener();
}

/** Lee los metadatos en un elemento suelto; una sola petición por URL. */
function probeVideoAspectRatio(url: string): Promise<void> {
  const inFlight = pending.get(url);
  if (inFlight) return inFlight;
  if (typeof document === "undefined") return Promise.resolve();

  const probe = new Promise<void>((resolve) => {
    const video = document.createElement("video");
    const finish = () => {
      video.removeEventListener("loadedmetadata", onMetadata);
      video.removeEventListener("error", finish);
      video.removeAttribute("src");
      video.load();
      pending.delete(url);
      resolve();
    };
    function onMetadata() {
      rememberVideoAspectRatio(url, video.videoWidth, video.videoHeight);
      finish();
    }
    video.addEventListener("loadedmetadata", onMetadata);
    video.addEventListener("error", finish);
    video.preload = "metadata";
    video.muted = true;
    video.src = url;
  });

  pending.set(url, probe);
  return probe;
}

const subscribe = (onStoreChange: () => void) => {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
};

/**
 * Proporción del vídeo al que apunta `src`, o `undefined` mientras no se conoce
 * (o si la URL no es un vídeo). Quien la use debe seguir teniendo una proporción
 * de reserva para el primer pintado.
 */
export function useVideoAspectRatio(src: string | null | undefined): number | undefined {
  const url = (src ?? "").trim();
  const isVideo = isVideoMediaUrl(url);

  const getSnapshot = useCallback(
    () => (isVideo ? cache.get(url) : undefined),
    [isVideo, url],
  );

  const aspect = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (!isVideo || cache.has(url)) return;
    void probeVideoAspectRatio(url);
  }, [isVideo, url]);

  return aspect;
}
