import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import AnimatedSection from "@/components/AnimatedSection";
import {
  clampCampaignTextPos,
  campaignCtaPath,
  DEFAULT_CAMPAIGN,
  type CampaignConfig,
} from "@/lib/campaign-content";
import { splitHeadlineByAccent } from "@/lib/collection-headline-content";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export type CampaignPreviewDevice = "desktop" | "mobile";

/**
 * Viewports que simula la preview del admin.
 * Escritorio: aspect 21/9 acotado por max-h-180 (720px), como en la web.
 * Móvil: aspect 4/5 a 390px de ancho.
 */
export const CAMPAIGN_PREVIEW_VIEWPORT: Record<
  CampaignPreviewDevice,
  { width: number; height: number }
> = {
  desktop: { width: 1920, height: Math.min(720, Math.round((1920 * 9) / 21)) },
  mobile: { width: 390, height: Math.round((390 * 5) / 4) },
};

const CAMPAIGN_PREVIEW_MAX_HEIGHT = 520;

interface CampaignBannerProps {
  config: CampaignConfig;
  /** Vista previa en admin: sin animación y con estado vacío si falta imagen. */
  preview?: boolean;
  /** En preview, fuerza tipografía, ratio e imagen de ese dispositivo. */
  previewDevice?: CampaignPreviewDevice;
  className?: string;
  /** Solo en preview: actualiza la posición al arrastrar el bloque de textos. */
  onTextPositionChange?: (pos: { x: number; y: number }) => void;
}

const CampaignBanner = ({
  config,
  preview = false,
  previewDevice = "desktop",
  className,
  onTextPositionChange,
}: CampaignBannerProps) => {
  const sectionRef = useRef<HTMLElement>(null);
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
  const useMobilePos = preview ? previewMobile : isMobileViewport;
  const textPosX = useMobilePos ? config.textPosMobileX : config.textPosX;
  const textPosY = useMobilePos ? config.textPosMobileY : config.textPosY;
  const mobileSrc = config.mobileImageUrl.trim() || config.desktopImageUrl;
  const desktopSrc = config.desktopImageUrl.trim() || mobileSrc;
  const previewSrc = previewMobile ? mobileSrc : desktopSrc;
  const hasImage = Boolean(previewSrc.trim());
  const subParts = splitHeadlineByAccent(config.subheadline, config.subheadlineAccent);
  const canDrag = Boolean(preview && onTextPositionChange);

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!canDrag || !onTextPositionChange) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      dragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        originX: textPosX,
        originY: textPosY,
      };
      setDragging(true);
    },
    [canDrag, textPosX, textPosY, onTextPositionChange],
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!canDrag || !onTextPositionChange || !dragRef.current) return;
      if (dragRef.current.pointerId !== e.pointerId) return;
      const section = sectionRef.current;
      if (!section) return;
      const rect = section.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const dxPct = ((e.clientX - dragRef.current.startX) / rect.width) * 100;
      const dyPct = ((e.clientY - dragRef.current.startY) / rect.height) * 100;
      onTextPositionChange(
        clampCampaignTextPos(dragRef.current.originX + dxPct, dragRef.current.originY + dyPct),
      );
    },
    [canDrag, onTextPositionChange],
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

  const ctaButton = (
    <button
      type="button"
      className={cn(
        "mt-6 inline-flex items-center justify-center rounded-full border border-white/70 px-6 py-3 font-sans text-xs font-bold uppercase tracking-[0.18em] shadow-md transition hover:brightness-105 sm:px-7 sm:text-sm",
        preview && (previewMobile ? "px-5 py-2.5 text-[0.7rem]" : "px-7 py-3"),
      )}
      style={{
        background: `linear-gradient(90deg, ${pink} 0%, #F0A0AB 50%, ${pink} 100%)`,
        color: config.ctaTextColor || DEFAULT_CAMPAIGN.ctaTextColor,
      }}
    >
      {ctaLabel}
    </button>
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
        style={{ color: config.headlineColor }}
      >
        {config.headline}
      </h2>

      <div
        className={cn(
          "flex items-center gap-3",
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
        style={{ color: config.subheadlineColor }}
      >
        {subParts ? (
          <>
            {subParts.before}
            <span className="italic" style={{ color: config.subheadlineAccentColor }}>
              {subParts.accent}
            </span>
            {subParts.after}
          </>
        ) : (
          config.subheadline
        )}
      </p>

      {preview ? (
        <div className="pointer-events-none">{ctaButton}</div>
      ) : (
        <Link to={campaignCtaPath(config)}>{ctaButton}</Link>
      )}
    </>
  );

  return (
    <section
      ref={sectionRef}
      className={cn(
        "relative w-full overflow-hidden",
        preview
          ? "h-full min-h-full"
          : "aspect-4/5 sm:aspect-video md:aspect-21/9 max-h-180",
        className,
      )}
      aria-label={config.alt}
    >
      {hasImage ? (
        preview ? (
          <img
            src={previewSrc}
            alt={config.alt}
            className="absolute inset-0 h-full w-full object-cover pointer-events-none"
            loading="eager"
            decoding="async"
            draggable={false}
          />
        ) : (
          <picture className="absolute inset-0 pointer-events-none">
            <source media="(max-width: 767px)" srcSet={mobileSrc} />
            <img
              src={config.desktopImageUrl}
              alt={config.alt}
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
              decoding="async"
              draggable={false}
            />
          </picture>
        )
      ) : (
        <div className="absolute inset-0 bg-[#E8DFD0]" aria-hidden />
      )}

      <div
        className={cn(
          "absolute z-1 text-left",
          preview
            ? previewMobile
              ? "max-w-[min(100%-1.5rem,28rem)]"
              : "max-w-xl"
            : "max-w-[min(100%-1.5rem,28rem)] md:max-w-lg lg:max-w-xl",
          canDrag && "cursor-grab touch-none select-none rounded-md ring-1 ring-white/70",
          dragging && "cursor-grabbing",
        )}
        style={{
          left: `${textPosX}%`,
          top: `${textPosY}%`,
        }}
        onPointerDown={canDrag ? handlePointerDown : undefined}
        onPointerMove={canDrag ? handlePointerMove : undefined}
        onPointerUp={canDrag ? endDrag : undefined}
        onPointerCancel={canDrag ? endDrag : undefined}
        role={canDrag ? "group" : undefined}
        aria-label={canDrag ? "Arrastra para colocar los textos" : undefined}
      >
        {preview ? textInner : <AnimatedSection>{textInner}</AnimatedSection>}
      </div>

      {preview && !hasImage && (
        <p className="absolute bottom-4 left-6 z-1 text-sm text-carbon/40">
          {previewMobile
            ? "Sube la imagen móvil (o la de escritorio) para ver la vista previa."
            : "Sube la imagen de escritorio para ver la vista previa real."}
        </p>
      )}
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
  const [containerWidth, setContainerWidth] = useState(0);
  const viewport = CAMPAIGN_PREVIEW_VIEWPORT[device];

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const update = () => setContainerWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // No ampliar por encima del tamaño real: en móvil deja bandas laterales claras.
  const scale =
    containerWidth > 0
      ? Math.min(
          1,
          containerWidth / viewport.width,
          CAMPAIGN_PREVIEW_MAX_HEIGHT / viewport.height,
        )
      : 0;

  const stageW = Math.round(viewport.width * scale);
  const stageH = Math.round(viewport.height * scale);

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
          className="origin-top-left"
          style={{
            width: viewport.width,
            height: viewport.height,
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
