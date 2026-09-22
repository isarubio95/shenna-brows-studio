import { useCallback, useEffect, useRef, useState } from "react";
import { posterUrlForVideoUrl } from "@/lib/media-url";
import { featureVideoAspectRatio, type ProductFeatureVideo } from "@/lib/product-feature-videos";

/** Coincide con `gap-3` (12px) del carrusel en móvil. */
const CAROUSEL_GAP_PX = 12;

interface FeatureVideoCardProps {
  video: ProductFeatureVideo;
  productName: string;
  /** Vertical: se limita el ancho para que no crezca de más en la columna. */
  capWidth?: boolean;
}

const FeatureVideoCard = ({ video, productName, capWidth = false }: FeatureVideoCardProps) => {
  const aspect = featureVideoAspectRatio(video);
  const label = video.title.trim() || `Vídeo de ${productName}`;

  return (
    <figure className={`m-0 ${capWidth && aspect < 1 ? "w-full max-w-72" : "w-full"}`}>
      <div className="rounded-2xl overflow-hidden border border-gold/15 bg-carbon shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
        <video
          src={video.videoUrl}
          poster={posterUrlForVideoUrl(video.videoUrl)}
          className="w-full h-full object-cover"
          style={{ aspectRatio: String(aspect) }}
          controls
          playsInline
          preload="metadata"
          controlsList="nodownload"
          aria-label={label}
        >
          Tu navegador no soporta la reproducción de vídeo.
        </video>
      </div>
      {video.title.trim() ? (
        <figcaption className="mt-3 font-playfair text-[0.95rem] leading-snug text-carbon/85">
          {video.title.trim()}
        </figcaption>
      ) : null}
    </figure>
  );
};

interface ProductFeatureVideosProps {
  videos: ProductFeatureVideo[];
  productName: string;
  className?: string;
}

/** Columna de vídeos apilados: la vista de ordenador, junto a la descripción. */
export const ProductFeatureVideoStack = ({
  videos,
  productName,
  className = "",
}: ProductFeatureVideosProps) => {
  if (videos.length === 0) return null;

  return (
    <div className={`space-y-10 ${className}`}>
      {videos.map((video) => (
        <FeatureVideoCard key={video.id} video={video} productName={productName} capWidth />
      ))}
    </div>
  );
};

/** Carrusel deslizable: la vista de móvil, debajo de «Envío». */
export const ProductFeatureVideoCarousel = ({
  videos,
  productName,
  className = "",
}: ProductFeatureVideosProps) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);

  const syncPage = useCallback(() => {
    const root = trackRef.current;
    if (!root || videos.length === 0) return;
    const first = root.children[0] as HTMLElement | undefined;
    if (!first) return;
    const step = Math.max(1, first.offsetWidth + CAROUSEL_GAP_PX);
    const maxPage = videos.length - 1;
    const maxScroll = root.scrollWidth - root.clientWidth;
    if (maxScroll <= 4) {
      setPage(0);
      return;
    }
    if (root.scrollLeft >= maxScroll - 4) {
      setPage(maxPage);
      return;
    }
    setPage(Math.max(0, Math.min(Math.round(root.scrollLeft / step), maxPage)));
  }, [videos.length]);

  useEffect(() => {
    const root = trackRef.current;
    if (!root || videos.length === 0) return;

    syncPage();
    root.addEventListener("scroll", syncPage, { passive: true });
    const ro = new ResizeObserver(syncPage);
    ro.observe(root);
    return () => {
      root.removeEventListener("scroll", syncPage);
      ro.disconnect();
    };
  }, [syncPage, videos.length]);

  const scrollToPage = useCallback((target: number) => {
    const root = trackRef.current;
    const first = root?.children[0] as HTMLElement | undefined;
    if (!root || !first) return;
    root.scrollTo({ left: target * (first.offsetWidth + CAROUSEL_GAP_PX), behavior: "smooth" });
  }, []);

  if (videos.length === 0) return null;

  return (
    <div className={className}>
      <div
        ref={trackRef}
        className="flex flex-row gap-3 overflow-x-auto overscroll-x-contain touch-pan-x snap-x snap-mandatory pb-1 scrollbar-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {videos.map((video) => (
          <div key={video.id} className="snap-start shrink-0 w-[68vw] max-w-72 min-w-0">
            <FeatureVideoCard video={video} productName={productName} />
          </div>
        ))}
      </div>

      {videos.length > 1 && (
        <div
          className="flex justify-center items-center gap-2 mt-4"
          role="tablist"
          aria-label="Posición en el carrusel de vídeos"
        >
          {videos.map((video, i) => (
            <button
              key={video.id}
              type="button"
              role="tab"
              aria-selected={i === page}
              aria-label={video.title.trim() || `Ver vídeo ${i + 1}`}
              onClick={() => scrollToPage(i)}
              className={`rounded-full transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2 ${
                i === page ? "h-2 w-6 bg-gold" : "h-2 w-2 bg-carbon/20 hover:bg-carbon/35"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
