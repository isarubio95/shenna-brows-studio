import { useCallback, useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Los vídeos de fondo (campaña, hero, tienda, popup) arrancan mudos porque
 * ningún navegador deja reproducir solo con sonido. Este botón es la única
 * forma de oírlos: el clic del visitante es el gesto que el navegador exige.
 *
 * Se marcan con `backgroundSoundProps` los vídeos que el botón debe controlar.
 */
export const backgroundSoundProps = { "data-background-sound": "true" } as const;

const SELECTOR = "video[data-background-sound]";

/**
 * Sólo se descarta el botón cuando el navegador confirma que el archivo no
 * trae pista de audio. Chrome no lo cuenta, así que ante la duda se ofrece.
 */
function knownSilent(video: HTMLVideoElement): boolean {
  if (video.readyState < HTMLMediaElement.HAVE_METADATA) return false;
  const probe = video as HTMLVideoElement & {
    mozHasAudio?: boolean;
    audioTracks?: { length: number };
  };
  if (typeof probe.mozHasAudio === "boolean") return !probe.mozHasAudio;
  if (probe.audioTracks && typeof probe.audioTracks.length === "number") {
    return probe.audioTracks.length === 0;
  }
  return false;
}

/** Un `md:hidden` deja el vídeo en el DOM reproduciéndose: sin esto sonarían dos a la vez. */
function isVisible(video: HTMLVideoElement): boolean {
  return video.getClientRects().length > 0;
}

interface BackgroundSoundButtonProps {
  /** Dónde buscar los vídeos. Por defecto, el elemento que contiene al botón. */
  containerRef?: React.RefObject<HTMLElement | null>;
  className?: string;
}

const BackgroundSoundButton = ({ containerRef, className }: BackgroundSoundButtonProps) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [soundOn, setSoundOn] = useState(false);
  const [offerButton, setOfferButton] = useState(false);

  const videos = useCallback((): HTMLVideoElement[] => {
    const root = containerRef?.current ?? buttonRef.current?.parentElement;
    return root ? Array.from(root.querySelectorAll<HTMLVideoElement>(SELECTOR)) : [];
  }, [containerRef]);

  useEffect(() => {
    const root = containerRef?.current ?? buttonRef.current?.parentElement;
    if (!root) return;

    let watched: HTMLVideoElement[] = [];
    const evaluate = () => {
      const list = videos();
      setOfferButton(list.length > 0 && list.some((video) => !knownSilent(video)));
    };
    // En el preview del admin el vídeo se cambia sin desmontar el botón.
    const listen = () => {
      const list = videos();
      watched.forEach((video) => video.removeEventListener("loadedmetadata", evaluate));
      watched = list;
      watched.forEach((video) => video.addEventListener("loadedmetadata", evaluate));
      evaluate();
    };

    listen();
    const observer = new MutationObserver(listen);
    observer.observe(root, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      watched.forEach((video) => video.removeEventListener("loadedmetadata", evaluate));
    };
  }, [containerRef, videos]);

  /** El sonido va siempre al vídeo que se está viendo; el del otro breakpoint se calla. */
  const apply = useCallback(
    (on: boolean) => {
      videos().forEach((video) => {
        const audible = on && isVisible(video);
        video.muted = !audible;
        if (audible) video.play()?.catch(() => {});
      });
    },
    [videos],
  );

  useEffect(() => {
    if (!soundOn) return;
    const onResize = () => apply(true);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [apply, soundOn]);

  const toggle = () => {
    const next = !soundOn;
    apply(next);
    setSoundOn(next);
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={toggle}
      aria-pressed={soundOn}
      aria-label={soundOn ? "Silenciar el vídeo" : "Activar el sonido del vídeo"}
      title={soundOn ? "Silenciar el vídeo" : "Activar el sonido del vídeo"}
      tabIndex={offerButton ? undefined : -1}
      className={cn(
        "absolute bottom-4 right-4 z-2 grid h-10 w-10 place-items-center rounded-full",
        "bg-carbon/45 text-white backdrop-blur-sm transition-colors duration-200",
        "hover:bg-carbon/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60",
        !offerButton && "hidden",
        className,
      )}
    >
      {soundOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
    </button>
  );
};

export default BackgroundSoundButton;
