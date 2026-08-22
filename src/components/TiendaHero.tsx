import {
  useCallback,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Link } from "react-router-dom";
import {
  Award,
  BadgeCheck,
  Clock,
  Heart,
  Package,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
  Zap,
  type LucideIcon,
} from "lucide-react";
import AnimatedSection from "@/components/AnimatedSection";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  clampTiendaHeroContentPos,
  DEFAULT_TIENDA_HERO,
  hexToRgba,
  isTiendaHeroInternalPath,
  resolveTiendaHeroImageUrl,
  tiendaHeroCtaHref,
  type TiendaHeroConfig,
  type TiendaHeroIconId,
} from "@/lib/tienda-hero-content";

const ICON_MAP: Record<TiendaHeroIconId, LucideIcon> = {
  "shield-check": ShieldCheck,
  truck: Truck,
  sparkles: Sparkles,
  package: Package,
  star: Star,
  clock: Clock,
  heart: Heart,
  award: Award,
  "badge-check": BadgeCheck,
  zap: Zap,
};

/** Zona clara inferior de la foto escritorio (1600×961). */
const TIENDA_HERO_CONTENT_ZONE_TOP = 59;
/** Zona de texto sobre la foto móvil vertical (941×1672). */
const TIENDA_HERO_MOBILE_CONTENT_ZONE_TOP = 42;
/** Dorado oscuro legible sobre fondo crema y degradé de la foto. */
const TIENDA_HERO_EYEBROW_COLOR = "#7A5C1E";

export type TiendaHeroPreviewDevice = "desktop" | "mobile";

export type TiendaHeroProps = {
  config: TiendaHeroConfig;
  /** Vista previa en admin: sin animación y CTA no navega. */
  preview?: boolean;
  /** En preview, fuerza la imagen de ese dispositivo. */
  previewDevice?: TiendaHeroPreviewDevice;
  className?: string;
  /** Solo en preview: actualiza la posición al arrastrar el bloque de contenido. */
  onContentPositionChange?: (pos: { x: number; y: number }) => void;
};

const overlayGradient = (strength: number): string => {
  const s = Math.min(100, Math.max(0, strength)) / 100;
  if (s <= 0) return "none";
  const from = 0.95 * s;
  const via = 0.88 * s;
  const to = 0.35 * s;
  return `linear-gradient(to bottom, rgba(255,255,255,${from}) 0%, rgba(255,255,255,${via}) 55%, rgba(255,255,255,${to}) 100%)`;
};

const TiendaHero = ({
  config,
  preview = false,
  previewDevice = "desktop",
  className,
  onContentPositionChange,
}: TiendaHeroProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
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
  const useMobileLayout = preview ? previewMobile : isMobileViewport;

  const mobileSrc = resolveTiendaHeroImageUrl(config.mobileImageUrl || config.desktopImageUrl, "mobile");
  const desktopSrc = resolveTiendaHeroImageUrl(config.desktopImageUrl || config.mobileImageUrl, "desktop");
  const previewSrc = useMobileLayout ? mobileSrc : desktopSrc;
  const hasImage = Boolean(preview ? previewSrc : desktopSrc);

  const contentPosX = useMobileLayout ? config.contentPosMobileX : config.contentPosX;
  const contentPosY = useMobileLayout ? config.contentPosMobileY : config.contentPosY;
  const overlayStrength =
    typeof config.overlayStrength === "number" && Number.isFinite(config.overlayStrength)
      ? Math.min(100, Math.max(0, Math.round(config.overlayStrength)))
      : DEFAULT_TIENDA_HERO.overlayStrength;
  const showOverlay = hasImage && overlayStrength > 0;

  const accent = config.accentColor || DEFAULT_TIENDA_HERO.accentColor;
  const headlineColor = config.headlineColor || DEFAULT_TIENDA_HERO.headlineColor;
  const descriptionColor = config.descriptionColor || DEFAULT_TIENDA_HERO.descriptionColor;
  const featureColor = config.featureColor || DEFAULT_TIENDA_HERO.featureColor;
  const ctaBg = config.ctaBg || DEFAULT_TIENDA_HERO.ctaBg;
  const ctaTextColor = config.ctaTextColor || DEFAULT_TIENDA_HERO.ctaTextColor;
  const href = tiendaHeroCtaHref(config);
  const ctaLabel = config.ctaText.trim() || DEFAULT_TIENDA_HERO.ctaText;
  const features = config.features.filter((f) => f.label.trim());
  const glow = hexToRgba(accent, 0.18);
  const imageAlt = config.alt.trim() || DEFAULT_TIENDA_HERO.alt;
  const canDrag = Boolean(preview && onContentPositionChange);

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!canDrag || !onContentPositionChange) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      dragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        originX: contentPosX,
        originY: contentPosY,
      };
      setDragging(true);
    },
    [canDrag, contentPosX, contentPosY, onContentPositionChange],
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!canDrag || !onContentPositionChange || !dragRef.current) return;
      if (dragRef.current.pointerId !== e.pointerId) return;
      const card = cardRef.current;
      if (!card) return;
      const rect = card.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const dxPct = ((e.clientX - dragRef.current.startX) / rect.width) * 100;
      const dyPct = ((e.clientY - dragRef.current.startY) / rect.height) * 100;
      onContentPositionChange(
        clampTiendaHeroContentPos(
          dragRef.current.originX + dxPct,
          dragRef.current.originY + dyPct,
        ),
      );
    },
    [canDrag, onContentPositionChange],
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

  const ctaClassName =
    "mt-6 md:mt-8 rounded-full px-8 py-6 text-sm tracking-[0.15em] uppercase shadow-[0_10px_30px_rgba(197,160,89,0.35)] hover:opacity-90";
  const ctaStyle = { backgroundColor: ctaBg, color: ctaTextColor };

  const ctaButton = preview ? (
    <Button type="button" className={ctaClassName} style={ctaStyle}>
      {ctaLabel}
    </Button>
  ) : isTiendaHeroInternalPath(href) ? (
    <Button asChild className={ctaClassName} style={ctaStyle}>
      <Link to={href}>{ctaLabel}</Link>
    </Button>
  ) : (
    <Button asChild className={ctaClassName} style={ctaStyle}>
      <a href={href}>{ctaLabel}</a>
    </Button>
  );

  const contentInner = (
    <>
      <p
        className="text-xs md:text-sm uppercase tracking-[0.28em] font-semibold mb-4 md:mb-5"
        style={{
          color: TIENDA_HERO_EYEBROW_COLOR,
          textShadow: "0 1px 0 rgba(255,255,255,0.85)",
        }}
      >
        {config.eyebrow}
      </p>
      <h1
        className="font-playfair text-[1.75rem] sm:text-3xl md:text-[2.35rem] lg:text-[2.65rem] leading-[1.15] max-w-3xl mx-auto text-balance"
        style={{ color: headlineColor }}
      >
        {config.headline}
      </h1>

      {features.length > 0 ? (
        <ul className="mt-6 md:mt-8 flex flex-wrap items-center justify-center gap-x-6 md:gap-x-10 lg:gap-x-12 gap-y-3 text-xs md:text-sm list-none p-0 m-0">
          {features.map((feature, index) => {
            const Icon = ICON_MAP[feature.icon] ?? ShieldCheck;
            return (
              <li
                key={`${index}-${feature.icon}`}
                className="inline-flex items-center gap-2 md:gap-2.5"
                style={{ color: featureColor }}
              >
                <Icon size={17} className="shrink-0" style={{ color: accent }} aria-hidden />
                {feature.label}
              </li>
            );
          })}
        </ul>
      ) : null}
    </>
  );

  const fallbackContentInner = (
    <>
      {contentInner}
      <p
        className="max-w-2xl mx-auto mt-5 text-sm md:text-lg leading-relaxed text-center"
        style={{ color: descriptionColor }}
      >
        {config.description}
      </p>
      <div className="flex justify-center">{ctaButton}</div>
    </>
  );

  const contentBlockClass =
    "w-full max-w-4xl px-4 sm:px-6 md:px-8 text-center";

  const renderMobileImage = (src: string) => (
    <div className="relative aspect-[9/16] w-full overflow-hidden bg-[#f8f5f2] md:hidden">
      <img
        src={src}
        alt={imageAlt}
        className="block h-auto w-full"
        loading="eager"
        decoding="async"
        draggable={false}
      />
    </div>
  );

  const renderDesktopImage = (src: string) => (
    <div className="relative hidden overflow-hidden md:block">
      <img
        src={src}
        alt={imageAlt}
        className="block h-auto w-full scale-[1.02] origin-top"
        loading="eager"
        decoding="async"
        draggable={false}
      />
    </div>
  );

  const imageElement = preview ? (
    useMobileLayout ? renderMobileImage(previewSrc) : renderDesktopImage(previewSrc)
  ) : (
    <>
      {renderMobileImage(mobileSrc)}
      {renderDesktopImage(desktopSrc)}
    </>
  );

  const contentZoneTop = useMobileLayout
    ? TIENDA_HERO_MOBILE_CONTENT_ZONE_TOP
    : TIENDA_HERO_CONTENT_ZONE_TOP;
  const overlayZoneHeight = 100 - contentZoneTop;
  const contentPositionStyle = hasImage
    ? {
        left: `${contentPosX}%`,
        top: `${contentZoneTop + (overlayZoneHeight * contentPosY) / 100}%`,
        transform: "translate(-50%, -50%)",
      }
    : undefined;

  const contentBlock = (
    <div
      className={cn(
        contentBlockClass,
        hasImage && "absolute z-10",
        canDrag && "cursor-grab touch-none select-none rounded-md ring-1 ring-gold/40",
        dragging && "cursor-grabbing",
      )}
      style={contentPositionStyle}
      onPointerDown={canDrag ? handlePointerDown : undefined}
      onPointerMove={canDrag ? handlePointerMove : undefined}
      onPointerUp={canDrag ? endDrag : undefined}
      onPointerCancel={canDrag ? endDrag : undefined}
      role={canDrag ? "group" : undefined}
      aria-label={canDrag ? "Arrastra para colocar el contenido en la zona clara" : undefined}
    >
      {preview ? contentInner : <AnimatedSection>{contentInner}</AnimatedSection>}
    </div>
  );

  const card = (
    <div
      ref={cardRef}
      className={cn(
        "relative overflow-hidden rounded-3xl border shadow-[0_14px_45px_rgba(0,0,0,0.06)]",
        hasImage && "bg-[#f8f5f2] md:bg-transparent",
      )}
      style={{
        borderColor: hexToRgba(accent, 0.2),
        backgroundImage: hasImage
          ? undefined
          : `radial-gradient(circle at top right, ${glow}, transparent 40%), linear-gradient(to bottom, #fffaf0, #ffffff)`,
      }}
    >
      {hasImage ? imageElement : null}

      {showOverlay ? (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: overlayGradient(overlayStrength) }}
          aria-hidden
        />
      ) : null}

      {hasImage ? contentBlock : null}

      {!hasImage && (
        <div className={cn("relative z-10 py-10 md:py-14", contentBlockClass)}>
          {preview ? fallbackContentInner : <AnimatedSection>{fallbackContentInner}</AnimatedSection>}
        </div>
      )}

      {preview && !previewSrc && (
        <p className="absolute bottom-4 left-6 z-10 text-xs text-carbon/40">
          {previewMobile
            ? "Sube la imagen móvil (o la de escritorio) para ver el fondo."
            : "Sube la imagen de escritorio para ver el fondo en la vista previa."}
        </p>
      )}
    </div>
  );

  if (preview) {
    return <div className={cn("w-full", className)}>{card}</div>;
  }

  return (
    <section className={cn("container mx-auto px-6", className)}>
      <AnimatedSection>{card}</AnimatedSection>
    </section>
  );
};

export default TiendaHero;
