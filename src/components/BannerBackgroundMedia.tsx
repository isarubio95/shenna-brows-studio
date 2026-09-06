import { useEffect, useRef } from "react";
import { isVideoMediaUrl } from "@/lib/media-url";
import { cn } from "@/lib/utils";

const MEDIA_CLASS = "absolute inset-0 z-0 h-full w-full object-cover pointer-events-none";

interface BannerBackgroundMediaProps {
  desktopSrc: string;
  mobileSrc: string;
  alt: string;
  preview?: boolean;
  previewMobile?: boolean;
  className?: string;
  mediaClassName?: string;
  eager?: boolean;
  fetchPriority?: "high" | "low" | "auto";
  preloadVideo?: "none" | "metadata" | "auto";
  width?: number;
  height?: number;
}

function BackgroundVideo({
  src,
  className,
  preload = "metadata",
}: {
  src: string;
  className?: string;
  preload?: "none" | "metadata" | "auto";
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      if (media.matches) {
        el.pause();
        return;
      }
      const playResult = el.play();
      if (playResult && typeof playResult.catch === "function") {
        playResult.catch(() => {
          /* autoplay can be blocked; first frame still shows */
        });
      }
    };

    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [src]);

  return (
    <video
      ref={ref}
      src={src}
      className={cn(MEDIA_CLASS, className)}
      autoPlay
      muted
      loop
      playsInline
      preload={preload}
      disablePictureInPicture
      aria-hidden
    />
  );
}

const BannerBackgroundMedia = ({
  desktopSrc,
  mobileSrc,
  alt,
  preview = false,
  previewMobile = false,
  className,
  mediaClassName,
  eager = false,
  fetchPriority,
  preloadVideo = "metadata",
  width,
  height,
}: BannerBackgroundMediaProps) => {
  if (preview) {
    const src = (previewMobile ? mobileSrc : desktopSrc).trim();
    if (!src) return null;
    if (isVideoMediaUrl(src)) {
      return (
        <BackgroundVideo
          src={src}
          className={cn(className, mediaClassName)}
          preload={preloadVideo}
        />
      );
    }
    return (
      <img
        src={src}
        alt={alt}
        className={cn(MEDIA_CLASS, className, mediaClassName)}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        draggable={false}
      />
    );
  }

  const desktop = desktopSrc.trim();
  const mobile = mobileSrc.trim() || desktop;
  if (!desktop && !mobile) return null;

  const desktopVideo = isVideoMediaUrl(desktop);
  const mobileVideo = isVideoMediaUrl(mobile);

  if (!desktopVideo && !mobileVideo) {
    return (
      <picture className={cn("absolute inset-0 z-0 pointer-events-none", className)}>
        {mobile ? <source media="(max-width: 767px)" srcSet={mobile} /> : null}
        <img
          src={desktop || mobile}
          alt={alt}
          width={width}
          height={height}
          className={cn("absolute inset-0 h-full w-full object-cover", mediaClassName)}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={fetchPriority}
          draggable={false}
        />
      </picture>
    );
  }

  return (
    <div className={cn("absolute inset-0 z-0 pointer-events-none", className)} aria-hidden>
      {mobileVideo ? (
        <BackgroundVideo
          src={mobile}
          className={cn("md:hidden", mediaClassName)}
          preload={preloadVideo}
        />
      ) : (
        <img
          src={mobile}
          alt=""
          className={cn(MEDIA_CLASS, "md:hidden", mediaClassName)}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          draggable={false}
        />
      )}
      {desktopVideo ? (
        <BackgroundVideo
          src={desktop || mobile}
          className={cn("hidden md:block", mediaClassName)}
          preload={preloadVideo}
        />
      ) : (
        <img
          src={desktop || mobile}
          alt={alt}
          width={width}
          height={height}
          className={cn(MEDIA_CLASS, "hidden md:block", mediaClassName)}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={fetchPriority}
          draggable={false}
        />
      )}
    </div>
  );
};

export default BannerBackgroundMedia;
