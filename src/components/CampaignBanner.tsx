import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import AnimatedSection from "@/components/AnimatedSection";
import {
  clampCampaignTextPos,
  type CampaignConfig,
} from "@/lib/campaign-content";
import { splitHeadlineByAccent } from "@/lib/collection-headline-content";
import { cn } from "@/lib/utils";

interface CampaignBannerProps {
  config: CampaignConfig;
  /** Vista previa en admin: sin animación y con estado vacío si falta imagen. */
  preview?: boolean;
  className?: string;
  /** Solo en preview: actualiza la posición al arrastrar el bloque de textos. */
  onTextPositionChange?: (pos: { x: number; y: number }) => void;
}

const CampaignBanner = ({
  config,
  preview = false,
  className,
  onTextPositionChange,
}: CampaignBannerProps) => {
  const hasImage = Boolean(config.desktopImageUrl.trim());
  const sectionRef = useRef<HTMLElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const [dragging, setDragging] = useState(false);

  const mobileSrc = config.mobileImageUrl.trim() || config.desktopImageUrl;
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
        originX: config.textPosX,
        originY: config.textPosY,
      };
      setDragging(true);
    },
    [canDrag, config.textPosX, config.textPosY, onTextPositionChange],
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

  if (!preview && !hasImage) return null;

  const textInner = (
    <>
      <h2
        className="font-playfair font-semibold uppercase tracking-[0.04em] leading-[1.2] text-[1.35rem] sm:text-2xl md:text-3xl lg:text-[2.15rem]"
        style={{ color: config.headlineColor }}
      >
        {config.headline}
      </h2>

      <div
        className="my-5 md:my-6 flex items-center gap-3 max-w-56 sm:max-w-[18rem]"
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
        className="font-cormorant text-base sm:text-lg md:text-xl leading-snug"
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
    </>
  );

  return (
    <section
      ref={sectionRef}
      className={cn(
        "relative w-full overflow-hidden aspect-4/5 sm:aspect-video md:aspect-21/9 max-h-180",
        className,
      )}
      aria-label={config.alt}
    >
      {hasImage ? (
        <picture className="absolute inset-0 pointer-events-none">
          <source media="(max-width: 767px)" srcSet={mobileSrc} />
          <img
            src={config.desktopImageUrl}
            alt={config.alt}
            className="absolute inset-0 h-full w-full object-cover"
            loading={preview ? "eager" : "lazy"}
            decoding="async"
            draggable={false}
          />
        </picture>
      ) : (
        <div className="absolute inset-0 bg-[#E8DFD0]" aria-hidden />
      )}

      <div
        className={cn(
          "absolute z-1 max-w-[min(100%-1.5rem,28rem)] md:max-w-lg lg:max-w-xl text-left",
          canDrag && "cursor-grab touch-none select-none rounded-md ring-1 ring-white/70",
          dragging && "cursor-grabbing",
        )}
        style={{
          left: `${config.textPosX}%`,
          top: `${config.textPosY}%`,
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
          Sube la imagen de escritorio para ver la vista previa real.
        </p>
      )}
    </section>
  );
};

export default CampaignBanner;
