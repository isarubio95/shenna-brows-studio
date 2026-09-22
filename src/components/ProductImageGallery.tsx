import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
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
  const trackRef = useRef<HTMLDivElement>(null);
  const selectedIndexRef = useRef(activeIndex ?? 0);
  const swipeGestureRef = useRef({ x: 0, swiped: false });
  const [selectedIndex, setSelectedIndex] = useState(activeIndex ?? 0);

  const setIndex = useCallback(
    (index: number) => {
      if (selectedIndexRef.current === index) return;
      selectedIndexRef.current = index;
      setSelectedIndex(index);
      onIndexChange?.(index);
    },
    [onIndexChange],
  );

  const syncFromScroll = useCallback(() => {
    const root = trackRef.current;
    if (!root || images.length === 0) return;
    const step = Math.max(1, root.clientWidth);
    const maxPage = images.length - 1;
    const maxScroll = root.scrollWidth - root.clientWidth;
    if (maxScroll <= 4) {
      setIndex(0);
      return;
    }
    if (root.scrollLeft >= maxScroll - 4) {
      setIndex(maxPage);
      return;
    }
    setIndex(Math.max(0, Math.min(Math.round(root.scrollLeft / step), maxPage)));
  }, [images.length, setIndex]);

  const scrollToPage = useCallback(
    (index: number, behavior: ScrollBehavior = "smooth") => {
      const root = trackRef.current;
      if (!root) return;
      const target = Math.max(0, Math.min(index, images.length - 1));
      const loopingAround =
        (selectedIndexRef.current === images.length - 1 && target === 0) ||
        (selectedIndexRef.current === 0 && target === images.length - 1);
      root.scrollTo({
        left: target * root.clientWidth,
        behavior: loopingAround ? "auto" : behavior,
      });
    },
    [images.length],
  );

  useEffect(() => {
    const root = trackRef.current;
    if (!root || !canSwipe) return;
    syncFromScroll();
    root.addEventListener("scroll", syncFromScroll, { passive: true });
    const ro = new ResizeObserver(syncFromScroll);
    ro.observe(root);
    return () => {
      root.removeEventListener("scroll", syncFromScroll);
      ro.disconnect();
    };
  }, [canSwipe, syncFromScroll]);

  useEffect(() => {
    if (!canSwipe || activeIndex == null) return;
    if (activeIndex === selectedIndexRef.current) return;
    scrollToPage(activeIndex);
  }, [activeIndex, canSwipe, scrollToPage]);

  const goPrev = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const next = selectedIndexRef.current === 0 ? images.length - 1 : selectedIndexRef.current - 1;
    scrollToPage(next);
  };

  const goNext = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const next = selectedIndexRef.current === images.length - 1 ? 0 : selectedIndexRef.current + 1;
    scrollToPage(next);
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
      className={cn("absolute inset-0 overflow-hidden", className)}
      data-product-gallery=""
      onPointerDown={(event) => {
        swipeGestureRef.current = { x: event.clientX, swiped: false };
      }}
      onPointerMove={(event) => {
        if (Math.abs(event.clientX - swipeGestureRef.current.x) > 12) {
          swipeGestureRef.current.swiped = true;
        }
      }}
      onClickCapture={(event) => {
        if (!swipeGestureRef.current.swiped) return;
        event.preventDefault();
        event.stopPropagation();
        swipeGestureRef.current.swiped = false;
      }}
    >
      <div
        ref={trackRef}
        className="flex h-full w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        aria-label={alt}
        aria-roledescription="carrusel"
      >
        {images.map((src, index) => (
          <div key={`${src}-${index}`} className="h-full min-w-full shrink-0 snap-center snap-always">
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
                scrollToPage(index);
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
