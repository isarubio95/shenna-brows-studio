import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import AnimatedSection from "@/components/AnimatedSection";
import {
  clampHeroTextPos,
  type HeroConfig,
} from "@/lib/hero-content";
import { splitHeadlineByAccent } from "@/lib/collection-headline-content";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const HERO_CTA_BASE =
  "text-[0.65rem] tracking-[0.22em] uppercase py-3 transition-all duration-300 active:scale-95 font-sans border";

export type HeroPreviewDevice = "desktop" | "mobile";

/**
 * Viewports que simula la preview del admin. Reproducen el recorte real de la web:
 * la sección ocupa 100dvh y la Navbar (fixed, opaca) tapa la franja superior.
 */
export const HERO_PREVIEW_VIEWPORT: Record<
  HeroPreviewDevice,
  { width: number; height: number; navbarHeight: number }
> = {
  desktop: { width: 1920, height: 1080, navbarHeight: 95 },
  mobile: { width: 390, height: 844, navbarHeight: 77 },
};

/** Alto máximo en px que puede ocupar la preview dentro del panel. */
const HERO_PREVIEW_MAX_HEIGHT = 620;

interface HeroSectionProps {
  config: HeroConfig;
  preview?: boolean;
  /** En preview, fuerza tipografía e imagen de ese dispositivo. */
  previewDevice?: HeroPreviewDevice;
  className?: string;
  onTextPositionChange?: (pos: { x: number; y: number }) => void;
  onScrollNext?: () => void;
}

const HeroSection = ({
  config,
  preview = false,
  previewDevice = "desktop",
  className,
  onTextPositionChange,
  onScrollNext,
}: HeroSectionProps) => {
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

  const mobileSrc = config.mobileImageUrl.trim() || config.desktopImageUrl;
  const desktopSrc = config.desktopImageUrl.trim() || mobileSrc;
  const line2Parts = splitHeadlineByAccent(config.line2, config.line2Accent);
  const canDrag = Boolean(preview && onTextPositionChange);
  const previewMobile = preview && previewDevice === "mobile";
  const useMobilePos = preview ? previewMobile : isMobileViewport;
  const textPosX = useMobilePos ? config.textPosMobileX : config.textPosX;
  const textPosY = useMobilePos ? config.textPosMobileY : config.textPosY;

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
        clampHeroTextPos(dragRef.current.originX + dxPct, dragRef.current.originY + dyPct),
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

  const ctaStyle = {
    backgroundColor: config.ctaBg,
    borderColor: config.ctaBg,
    color: config.ctaTextColor,
  };

  const headline = (
    <h1
      className={cn(
        "font-playfair font-normal text-left tracking-[0.05em] uppercase leading-[1.35] mb-8 drop-shadow-[0_1px_6px_rgba(0,0,0,0.25)]",
        preview
          ? previewMobile
            ? "text-[1.7rem]"
            : "text-[3rem]"
          : "text-[1.7rem] md:text-[2.1rem] lg:text-[3rem]",
      )}
      style={{ color: config.headlineColor }}
    >
      <span className="block">{config.line1}</span>
      <span className="block">
        {line2Parts ? (
          <>
            {line2Parts.before}
            <span className="italic" style={{ color: config.headlineAccentColor }}>
              {line2Parts.accent}
            </span>
            {line2Parts.after}
          </>
        ) : (
          config.line2
        )}
      </span>
    </h1>
  );

  const ctaButton = (
    <button
      type="button"
      className={cn(
        HERO_CTA_BASE,
        preview ? (previewMobile ? "px-6" : "px-7") : "px-6 sm:px-7",
      )}
      style={ctaStyle}
    >
      {config.ctaText}
    </button>
  );

  const textInner = (
    <div className="flex flex-col items-start">
      {preview ? headline : <AnimatedSection>{headline}</AnimatedSection>}
      {preview ? (
        <div className="pointer-events-none">{ctaButton}</div>
      ) : (
        <AnimatedSection delay={0.15}>
          <Link to={config.ctaHref || "/tienda"}>{ctaButton}</Link>
        </AnimatedSection>
      )}
    </div>
  );

  const scrollChevron = (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-3 pointer-events-none">
      <div
        className={cn(
          "text-white/90 flex items-center justify-center",
          previewMobile ? "mb-3" : "mb-4",
        )}
      >
        <svg
          width="34"
          height="34"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.1"
          className="mx-auto drop-shadow-[0_4px_8px_rgba(0,0,0,0.35)]"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
    </div>
  );

  return (
    <section
      ref={sectionRef}
      className={cn(
        "relative w-full overflow-hidden",
        preview ? "h-full min-h-full" : "min-h-dvh",
        className,
      )}
      aria-label={config.alt}
    >
      {preview ? (
        <img
          src={previewMobile ? mobileSrc : desktopSrc}
          alt={config.alt}
          className={cn(
            "absolute inset-0 z-0 h-full w-full object-cover pointer-events-none",
            previewMobile ? "object-[center_calc(50%+4rem)]" : "object-[55%_35%]",
          )}
          draggable={false}
        />
      ) : (
        <picture className="absolute inset-0 z-0 pointer-events-none">
          <source media="(max-width: 767px)" srcSet={mobileSrc} />
          <img
            src={desktopSrc}
            alt={config.alt}
            width={2640}
            height={1470}
            decoding="async"
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover max-lg:object-[center_calc(50%+4rem)] lg:object-[55%_35%]"
            draggable={false}
          />
        </picture>
      )}

      <div
        className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.35)_0%,rgba(0,0,0,0.18)_10%,transparent_25%,transparent_70%,rgba(0,0,0,0.18)_100%)] z-1 pointer-events-none"
        aria-hidden
      />

      <div
        className={cn(
          "absolute z-2 text-left",
          preview
            ? previewMobile
              ? "max-w-[min(100%-1.5rem,36rem)]"
              : "max-w-[58%]"
            : "max-w-[min(100%-1.5rem,36rem)] lg:max-w-[58%]",
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
        aria-label={canDrag ? "Arrastra para colocar el contenido del hero" : undefined}
      >
        {textInner}
      </div>

      {preview ? (
        scrollChevron
      ) : onScrollNext ? (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-3">
          <AnimatedSection delay={0.3}>
            <motion.button
              type="button"
              onClick={onScrollNext}
              aria-label="Bajar a la siguiente sección"
              animate={{ y: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="mb-3 sm:mb-4 text-white/90 hover:text-white transition-colors duration-300 flex items-center justify-center"
            >
              <svg
                width="34"
                height="34"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.1"
                className="mx-auto drop-shadow-[0_4px_8px_rgba(0,0,0,0.35)]"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </motion.button>
          </AnimatedSection>
        </div>
      ) : null}
    </section>
  );
};

/**
 * Reproduce a escala el viewport real del dispositivo (100dvh + Navbar fija encima),
 * de modo que la preview recorte la foto igual que la web.
 */
export function HeroPreviewFrame({
  device,
  children,
}: {
  device: HeroPreviewDevice;
  children: ReactNode;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const viewport = HERO_PREVIEW_VIEWPORT[device];

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
          HERO_PREVIEW_MAX_HEIGHT / viewport.height,
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
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-10 border-b border-carbon/10 bg-cream"
            style={{ height: viewport.navbarHeight }}
            aria-hidden
          />
        </div>
      </div>
    </div>
  );
}

export default HeroSection;
