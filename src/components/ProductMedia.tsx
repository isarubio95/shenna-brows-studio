import { isVideoMediaUrl, posterUrlForVideoUrl } from "@/lib/media-url";

interface ProductMediaProps {
  src: string;
  alt: string;
  className?: string;
  /**
   * `true` en la ficha del producto: el vídeo se reproduce solo, en bucle y sin
   * sonido. `false` en tarjetas y miniaturas, donde se pinta sólo el póster.
   */
  playable?: boolean;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
  /**
   * Fuerza la descarga de metadatos del vídeo. Sirve donde no se puede contar con
   * el póster (el panel de administración) y hace falta ver el primer fotograma.
   */
  preload?: "none" | "metadata";
}

/**
 * Pinta un elemento de la galería de producto, que puede ser una foto o un vídeo.
 * El póster del vídeo se sube junto a él, así que se deriva de su propia URL.
 */
const ProductMedia = ({
  src,
  alt,
  className,
  playable = false,
  loading = "lazy",
  fetchPriority,
  preload,
}: ProductMediaProps) => {
  if (isVideoMediaUrl(src)) {
    const poster = posterUrlForVideoUrl(src);
    return (
      <video
        src={src}
        poster={poster}
        className={className}
        // Sin `playable` no se descarga el vídeo: basta el póster o el primer fotograma.
        preload={preload ?? (playable ? "metadata" : "none")}
        autoPlay={playable}
        loop={playable}
        muted
        playsInline
        controls={playable}
        controlsList="nodownload"
        disablePictureInPicture={!playable}
        aria-label={alt}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={loading}
      decoding="async"
      fetchPriority={fetchPriority}
      draggable={false}
    />
  );
};

export default ProductMedia;
