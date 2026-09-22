import { useCallback, useEffect, useRef, useState, type MouseEvent, type TouchEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ProductMedia from "@/components/ProductMedia";
import { cn } from "@/lib/utils";

/** Marca la galería para que el carrusel de productos no robe el gesto horizontal. */
export const PRODUCT_IMAGE_GALLERY_ATTR = "data-product-gallery";

/**
 * Embla llama a esto en `touchstart`/`mousedown`. Si el gesto empieza en la
 * galería de fotos, el carrusel padre no debe arrancar el arrastre.
 */
export function allowEmblaDragOutsideProductGallery(
  _emblaApi: unknown,
  event: { target: EventTarget | null },
): boolean {
  const { target } = event;
  return !(target instanceof Element && target.closest(`[${PRODUCT_IMAGE_GALLERY_ATTR}]`));
}

interface ProductImageGalleryProps {
  images: string[];
  alt: string;
  className?: string;
  mediaClassName?: string;
  playable?: boolean;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
  /** Puntos de posición; en las cards de tienda. */
  showDots?: boolean;
  /** Flechas más pequeñas, como en las cards. */
  compact?: boolean;
  /** Índice controlado (miniaturas de la ficha). */
  activeIndex?: number;
  onIndexChange?: (index: number) => void;
}

const ProductImageGallery = ({
  images,
  alt,
  className,
  mediaClassName,
  playable = false,
  loading = "lazy",
  fetchPriority,
  showDots = false,
  compact = false,
  activeIndex,
  onIndexChange,
}: ProductImageGalleryProps) => {
  const canSwipe = images.length > 1;
  const rootRef = useRef<HTMLDivElement>(null);
  const gestureRef = useRef({ x: 0, y: 0, axis: null as "x" | "y" | null, swiped: false });
  const [selectedIndex, setSelectedIndex] = useState(activeIndex ?? 0);
  const [dragOffset, setDragOffset] = useState<number | null>(null);

  const goTo = useCallback(
    (index: number) => {
      const target = Math.max(0, Math.min(index, images.length - 1));
      setSelectedIndex(target);
      onIndexChange?.(target);
    },
    [images.length, onIndexChange],
  );

  useEffect(() => {
    if (activeIndex == null) return;
    setSelectedIndex(Math.max(0, Math.min(activeIndex, images.length - 1)));
  }, [activeIndex, images.length]);

  const goPrev = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    goTo(selectedIndex === 0 ? images.length - 1 : selectedIndex - 1);
  };

  const goNext = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    goTo(selectedIndex === images.length - 1 ? 0 : selectedIndex + 1);
  };

  // Transform + touch events en vez de scroll-snap nativo: WebKit en iOS (y los
  // navegadores embebidos de Instagram) se atasca con scrollTo sobre snap-mandatory.
  const onTouchStart = (event: TouchEvent) => {
    const touch = event.touches[0];
    gestureRef.current = { x: touch.clientX, y: touch.clientY, axis: null, swiped: false };
  };

  const onTouchMove = (event: TouchEvent) => {
    const touch = event.touches[0];
    const gesture = gestureRef.current;
    const dx = touch.clientX - gesture.x;
    const dy = touch.clientY - gesture.y;
    if (!gesture.axis) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      gesture.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }
    if (gesture.axis !== "x") return;
    gesture.swiped = true;
    const atEdge =
      (selectedIndex === 0 && dx > 0) || (selectedIndex === images.length - 1 && dx < 0);
    setDragOffset(atEdge ? dx / 3 : dx);
  };

  const onTouchEnd = () => {
    const offset = dragOffset;
    setDragOffset(null);
    if (offset == null) return;
    const width = rootRef.current?.clientWidth ?? 0;
    const threshold = Math.min(60, width * 0.2);
    if (offset <= -threshold) goTo(selectedIndex + 1);
    else if (offset >= threshold) goTo(selectedIndex - 1);
  };

  if (images.length === 0) return null;

  if (!canSwipe) {
    return (
      <div className={cn("absolute inset-0 overflow-hidden", className)}>
        <ProductMedia
          src={images[0]}
          alt={alt}
          className={cn("h-full w-full object-cover", mediaClassName)}
          playable={playable}
          loading={loading}
          fetchPriority={fetchPriority}
        />
      </div>
    );
  }

  const arrowClass = compact
    ? "absolute top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-1.5 text-carbon shadow hover:bg-white"
    : "absolute top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/95 p-2 text-carbon shadow hover:bg-white";
  const arrowSize = compact ? 16 : 20;

  return (
    <div
      ref={rootRef}
      className={cn("absolute inset-0 touch-pan-y overflow-hidden", className)}
      data-product-gallery=""
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      onClickCapture={(event) => {
        if (!gestureRef.current.swiped) return;
        event.preventDefault();
        event.stopPropagation();
        gestureRef.current.swiped = false;
      }}
    >
      <div
        className={cn(
          "flex h-full w-full",
          dragOffset == null && "transition-transform duration-300 ease-out",
        )}
        style={{ transform: `translateX(calc(${-selectedIndex * 100}% + ${dragOffset ?? 0}px))` }}
        aria-label={alt}
        aria-roledescription="carrusel"
      >
        {images.map((src, index) => (
          <div
            key={`${src}-${index}`}
            className="h-full min-w-full shrink-0"
            aria-hidden={index === selectedIndex ? undefined : true}
          >
            <ProductMedia
              src={src}
              alt={index === 0 ? alt : `${alt} ${index + 1}`}
              className={cn(
                "h-full w-full object-cover",
                !playable && "pointer-events-none",
                mediaClassName,
              )}
              playable={playable}
              loading={index === 0 ? loading : "lazy"}
              fetchPriority={index === 0 ? fetchPriority : undefined}
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        aria-label="Foto anterior"
        onClick={goPrev}
        className={cn(arrowClass, compact ? "left-2" : "left-3")}
      >
        <ChevronLeft size={arrowSize} />
      </button>
      <button
        type="button"
        aria-label="Siguiente foto"
        onClick={goNext}
        className={cn(arrowClass, compact ? "right-2" : "right-3")}
      >
        <ChevronRight size={arrowSize} />
      </button>

      {showDots && (
        <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
          {images.map((_, index) => (
            <button
              key={`dot-${index}`}
              type="button"
              aria-label={`Ver foto ${index + 1}`}
              aria-current={index === selectedIndex ? "true" : undefined}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                goTo(index);
              }}
              className={`h-1.5 rounded-full transition-all ${
                index === selectedIndex ? "w-5 bg-white" : "w-2 bg-white/70"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductImageGallery;
