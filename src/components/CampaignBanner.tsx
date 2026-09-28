import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import AnimatedSection from "@/components/AnimatedSection";
import BannerBackgroundMedia from "@/components/BannerBackgroundMedia";
import BackgroundSoundButton from "@/components/BackgroundSoundButton";
import {
  campaignCtaPath,
  clampCampaignCtaPos,
  DEFAULT_CAMPAIGN,
  type CampaignConfig,
  type CampaignCtaSize,
} from "@/lib/campaign-content";
import { splitHeadlineByAccent } from "@/lib/collection-headline-content";
import { useIsMobile } from "@/hooks/use-mobile";
import { useVideoAspectRatio } from "@/lib/video-aspect-ratio";
import { fontStyle } from "@/lib/fonts";
import { cn } from "@/lib/utils";

export type CampaignPreviewDevice = "desktop" | "mobile";

/** Viewports que simula la preview del admin: ancho real del dispositivo. */
export const CAMPAIGN_PREVIEW_VIEWPORT: Record<CampaignPreviewDevice, { width: number }> = {
  desktop: { width: 1920 },
  mobile: { width: 390 },
};

const CAMPAIGN_PREVIEW_MAX_HEIGHT = 640;

const CTA_SIZE_CLASS: Record<CampaignCtaSize, { site: string; desktop: string; mobile: string }> = {
  sm: {
    site: "px-4 py-2 text-[0.65rem] sm:px-5 sm:text-xs",
    desktop: "px-5 py-2 text-xs",
    mobile: "px-4 py-2 text-[0.65rem]",
  },
  md: {
    site: "px-6 py-3 text-xs sm:px-7 sm:text-sm",
    desktop: "px-7 py-3 text-sm",
    mobile: "px-6 py-3 text-xs",
  },
  lg: {
    site: "px-7 py-3.5 text-sm sm:px-9 sm:py-4 sm:text-base",
    desktop: "px-9 py-4 text-base",
    mobile: "px-7 py-3.5 text-sm",
  },
};

interface CampaignBannerProps {
  config: CampaignConfig;
  /** Vista previa en admin: sin animación y con estado vacío si falta imagen. */
  preview?: boolean;
  /** En preview, fuerza tipografía, ratio e imagen de ese dispositivo. */
  previewDevice?: CampaignPreviewDevice;
  className?: string;
  /** Solo en preview: arrastrar el botón y devolver su nueva posición (%). */
  onCtaPositionChange?: (pos: { x: number; y: number }) => void;
}

const CampaignBanner = ({
  config,
  preview = false,
  previewDevice = "desktop",
  className,
  onCtaPositionChange,
}: CampaignBannerProps) => {
  const mediaRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const [dragging, setDragging] = useState(false);
  const isMobileViewport = useIsMobile();

  const previewMobile = preview && previewDevice === "mobile";
  const mobileSrc = config.mobileImageUrl.trim() || config.desktopImageUrl;
  const desktopSrc = config.desktopImageUrl.trim() || mobileSrc;
  const previewSrc = previewMobile ? mobileSrc : desktopSrc;
  const hasMedia = Boolean(previewSrc.trim());
  // El vídeo no pasa por el recortador del admin: manda su propia proporción,
  // así se ve entero en lugar de recortado por arriba y por abajo.
  const activeSrc = preview ? previewSrc : isMobileViewport ? mobileSrc : desktopSrc;
  const videoAspect = useVideoAspectRatio(activeSrc);
  const subParts = splitHeadlineByAccent(config.subheadline, config.subheadlineAccent);
  const canDrag = Boolean(preview && onCtaPositionChange);
  const ctaPosX = previewMobile ? config.ctaPosMobileX : config.ctaPosX;
  const ctaPosY = previewMobile ? config.ctaPosMobileY : config.ctaPosY;

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!canDrag) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      dragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        originX: ctaPosX,
        originY: ctaPosY,
      };
      setDragging(true);
    },
    [canDrag, ctaPosX, ctaPosY],
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!canDrag || !onCtaPositionChange || !dragRef.current) return;
      if (dragRef.current.pointerId !== e.pointerId) return;
      const media = mediaRef.current;
      if (!media) return;
      const rect = media.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const dxPct = ((e.clientX - dragRef.current.startX) / rect.width) * 100;
      const dyPct = ((e.clientY - dragRef.current.startY) / rect.height) * 100;
      onCtaPositionChange(
        clampCampaignCtaPos(dragRef.current.originX + dxPct, dragRef.current.originY + dyPct),
      );
    },
    [canDrag, onCtaPositionChange],
  );

  const endDrag = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || dragRef.current.pointerId !== e.pointerId) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    dragRef.current = null;
    setDragging(false);
  }, []);

  if (!preview && !config.desktopImageUrl.trim()) return null;

  const pink = config.ctaBg || DEFAULT_CAMPAIGN.ctaBg;
  const ctaLabel = config.ctaText.trim() || DEFAULT_CAMPAIGN.ctaText;

  const ctaSize = CTA_SIZE_CLASS[config.ctaSize] ?? CTA_SIZE_CLASS.md;
  const ctaClassName = cn(
    "inline-flex items-center justify-center whitespace-nowrap rounded-full border font-sans font-bold uppercase tracking-[0.18em] shadow-md transition hover:brightness-105",
    preview ? (previewMobile ? ctaSize.mobile : ctaSize.desktop) : ctaSize.site,
  );
  const ctaStyle: CSSProperties = {
    background:
      config.ctaFill === "solid"
        ? pink
        : `linear-gradient(90deg, ${pink} 0%, #F0A0AB 50%, ${pink} 100%)`,
    borderColor: config.ctaBorderColor || DEFAULT_CAMPAIGN.ctaBorderColor,
    color: config.ctaTextColor || DEFAULT_CAMPAIGN.ctaTextColor,
    ...fontStyle(config.fonts.cta),
  };

  // Va sobre la foto o el vídeo, con su propia posición en escritorio y en móvil.
  // El desplazamiento propio es proporcional a la posición (0 % → pegado al borde
  // izquierdo, 50 % → centrado, 100 % → pegado al derecho), así nunca se sale.
  const ctaOverlay = (
    <div
      className={cn(
        "absolute z-3 left-(--cta-ax) top-(--cta-ay)",
        !preview && [
          // Posición vía CSS vars + breakpoint: evita el parpadeo de useIsMobile.
          "[--cta-ax:var(--cta-x)] [--cta-ay:var(--cta-y)]",
          "max-md:[--cta-ax:var(--cta-x-m)] max-md:[--cta-ay:var(--cta-y-m)]",
        ],
        canDrag && "cursor-grab touch-none select-none rounded-full ring-2 ring-white/80 ring-offset-2 ring-offset-transparent",
        dragging && "cursor-grabbing",
      )}
      style={
        {
          "--cta-x": `${config.ctaPosX}%`,
          "--cta-y": `${config.ctaPosY}%`,
          "--cta-x-m": `${config.ctaPosMobileX}%`,
          "--cta-y-m": `${config.ctaPosMobileY}%`,
          ...(preview ? { "--cta-ax": `${ctaPosX}%`, "--cta-ay": `${ctaPosY}%` } : {}),
          transform: "translate(calc(var(--cta-ax) * -1), calc(var(--cta-ay) * -1))",
        } as CSSProperties
      }
      onPointerDown={canDrag ? handlePointerDown : undefined}
      onPointerMove={canDrag ? handlePointerMove : undefined}
      onPointerUp={canDrag ? endDrag : undefined}
      onPointerCancel={canDrag ? endDrag : undefined}
      role={canDrag ? "group" : undefined}
      aria-label={canDrag ? "Arrastra para colocar el botón de la campaña" : undefined}
    >
      {preview ? (
        <span className={cn(ctaClassName, "pointer-events-none")} style={ctaStyle}>
          {ctaLabel}
        </span>
      ) : (
        <AnimatedSection>
          <Link to={campaignCtaPath(config)} className={ctaClassName} style={ctaStyle}>
            {ctaLabel}
          </Link>
        </AnimatedSection>
      )}
    </div>
  );

  const textInner = (
    <>
      <h2
        className={cn(
          "font-playfair font-semibold uppercase tracking-[0.04em] leading-[1.2]",
          preview
            ? previewMobile
              ? "text-[1.35rem]"
              : "text-[2.15rem]"
            : "text-[1.35rem] sm:text-2xl md:text-3xl lg:text-[2.15rem]",
        )}
        style={{ color: config.headlineColor, ...fontStyle(config.fonts.headline) }}
      >
        {config.headline}
      </h2>

      <div
        className={cn(
          "mx-auto flex items-center gap-3",
          preview
            ? previewMobile
              ? "my-5 max-w-56"
              : "my-6 max-w-[18rem]"
            : "my-5 md:my-6 max-w-56 sm:max-w-[18rem]",
        )}
        aria-hidden
      >
        <span className="h-px flex-1" style={{ backgroundColor: config.dividerColor }} />
        <span
          className="h-1.5 w-1.5 rotate-45 shrink-0"
          style={{ backgroundColor: config.dividerColor }}
        />
        <span className="h-px flex-1" style={{ backgroundColor: config.dividerColor }} />
      </div>

      <p
        className={cn(
          "font-cormorant leading-snug",
          preview
            ? previewMobile
              ? "text-base"
              : "text-xl"
            : "text-base sm:text-lg md:text-xl",
        )}
        style={{ color: config.subheadlineColor, ...fontStyle(config.fonts.subheadline) }}
      >
        {subParts ? (
          <>
            {subParts.before}
            <span
              className="italic"
              style={{
                color: config.subheadlineAccentColor,
                ...fontStyle(config.fonts.subheadlineAccent),
              }}
            >
              {subParts.accent}
            </span>
            {subParts.after}
          </>
        ) : (
          config.subheadline
        )}
      </p>
    </>
  );

  return (
    <section className={cn("relative w-full overflow-hidden", className)} aria-label={config.alt}>
      <div
        ref={mediaRef}
        className={cn(
          "relative w-full overflow-hidden",
          preview
            ? previewMobile
              ? "aspect-4/5"
              : "aspect-21/9 max-h-180"
            : videoAspect
              ? ""
              : "aspect-4/5 sm:aspect-video md:aspect-21/9 max-h-180",
        )}
        style={videoAspect ? { aspectRatio: String(videoAspect) } : undefined}
      >
        {hasMedia ? (
          <BannerBackgroundMedia
            desktopSrc={desktopSrc}
            mobileSrc={mobileSrc}
            alt={config.alt}
            preview={preview}
            previewMobile={previewMobile}
            eager={preview}
          />
        ) : (
          <div className="absolute inset-0 bg-[#E8DFD0]" aria-hidden />
        )}

        {ctaOverlay}

        {hasMedia ? <BackgroundSoundButton containerRef={mediaRef} className="z-2" /> : null}

        {preview && !hasMedia && (
          <p className="absolute bottom-4 left-6 z-1 text-sm text-carbon/40">
            {previewMobile
              ? "Sube la imagen o el vídeo móvil (o el de escritorio) para ver la vista previa."
              : "Sube la imagen o el vídeo de escritorio para ver la vista previa real."}
          </p>
        )}
      </div>

      <div
        className={cn(
          "bg-cream px-6 py-10 text-center",
          preview ? (previewMobile ? "px-5 py-8" : "px-8 py-10") : "sm:py-12",
        )}
      >
        <div className="mx-auto flex max-w-xl flex-col items-center">
          {preview ? textInner : <AnimatedSection className="flex flex-col items-center">{textInner}</AnimatedSection>}
        </div>
      </div>
    </section>
  );
};

/** Escala la campaña al viewport del dispositivo simulado dentro del admin. */
export function CampaignPreviewFrame({
  device,
  children,
}: {
  device: CampaignPreviewDevice;
  children: ReactNode;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const viewportWidth = CAMPAIGN_PREVIEW_VIEWPORT[device].width;

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const update = () => setContainerWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Mide la altura natural del contenido (media + texto debajo) al ancho real
  // del dispositivo, sin que la afecte el `transform: scale` usado para mostrarla.
  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const update = () => setContentHeight(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [device]);

  // No ampliar por encima del tamaño real: en móvil deja bandas laterales claras.
  const scale =
    containerWidth > 0 && contentHeight > 0
      ? Math.min(1, containerWidth / viewportWidth, CAMPAIGN_PREVIEW_MAX_HEIGHT / contentHeight)
      : 0;

  const stageW = Math.round(viewportWidth * scale);
  const stageH = Math.round(contentHeight * scale);

  return (
    <div
      ref={outerRef}
      className="relative flex w-full items-start justify-center overflow-hidden bg-carbon/15"
      style={{ height: stageH || undefined, minHeight: scale === 0 ? 120 : undefined }}
    >
      <div
        className="relative shrink-0 overflow-hidden bg-carbon/5 shadow-[0_0_0_1px_rgba(0,0,0,0.08)]"
        style={{ width: stageW, height: stageH }}
      >
        <div
          ref={innerRef}
          className="origin-top-left"
          style={{
            width: viewportWidth,
            transform: `scale(${scale})`,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export default CampaignBanner;
