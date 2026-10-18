import { useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AnimatedSection from "@/components/AnimatedSection";
import BackgroundSoundButton, { backgroundSoundProps } from "@/components/BackgroundSoundButton";
import { ProductPriceDisplay } from "@/components/ProductPriceDisplay";
import { ProductSaleBadge } from "@/components/ProductSaleBadge";
import type { CatalogProduct } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import { useElixirSpotlight } from "@/hooks/use-elixir-spotlight";
import { useHeroCtaStyle } from "@/hooks/use-hero-cta-style";
import { toCartProduct } from "@/lib/cart-product";
import { parseColorVariants } from "@/lib/color-variants";
import { pickDemoVideo, type ElixirSpotlightConfig } from "@/lib/elixir-spotlight-content";
import { posterUrlForVideoUrl } from "@/lib/media-url";
import { featureVideoAspectRatio, parseProductFeatureVideos } from "@/lib/product-feature-videos";
import { getProductPosterUrl } from "@/lib/product-images";
import { SITE_CTA_CLASS } from "@/lib/site-cta";
import { cn } from "@/lib/utils";

/** Fondo rosado suave: separa el protagonista de los valores (crema) y la campaña. */
const SECTION_BG = "#FBF1F0";

/** Reproduce el vídeo solo mientras está en pantalla: ahorra datos en el móvil. */
function useAutoplayInView(enabled: boolean) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!enabled || !video || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) video.play()?.catch(() => {});
        else video.pause();
      },
      { threshold: 0.35 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [enabled]);
  return ref;
}

interface ElixirSpotlightViewProps {
  config: ElixirSpotlightConfig;
  product: CatalogProduct;
  /** Vista previa en el panel: sin animación ni compra. */
  preview?: boolean;
  onAddToCart?: () => void;
  addToCartDisabled?: boolean;
}

export function ElixirSpotlightView({
  config,
  product,
  preview = false,
  onAddToCart,
  addToCartDisabled = false,
}: ElixirSpotlightViewProps) {
  const heroCtaStyle = useHeroCtaStyle();
  const mediaRef = useRef<HTMLDivElement>(null);
  const videos = useMemo(() => parseProductFeatureVideos(product.feature_videos), [product.feature_videos]);
  const demo = pickDemoVideo(videos, config.demoVideoId);
  const videoRef = useAutoplayInView(Boolean(demo) && !preview);
  const outOfStock = Number(product.stock ?? 0) <= 0;
  const needsColor = parseColorVariants(product.color_variants).length > 0;
  const title = config.title || product.category;
  const productHref = `/${product.slug}`;

  const header = (
    <div className="text-center lg:text-left">
      {config.eyebrow ? (
        <p className="text-gold text-xs uppercase tracking-[0.3em] font-medium mb-3">{config.eyebrow}</p>
      ) : null}
      <h2
        id={preview ? undefined : "elixir-spotlight-title"}
        className="font-playfair text-4xl font-bold uppercase leading-none tracking-wide md:text-6xl"
      >
        {title}
      </h2>
      <p className="mt-3 text-xs uppercase tracking-[0.22em] text-carbon/60 md:text-sm">{product.name}</p>
    </div>
  );

  const media = (
    <div ref={mediaRef} className="relative mx-auto w-full max-w-sm lg:max-w-md">
      <div className="relative overflow-hidden rounded-3xl bg-carbon/5 shadow-[0_24px_50px_-28px_rgba(120,60,70,0.55)] ring-1 ring-gold/15">
        {demo ? (
          <video
            ref={videoRef}
            src={demo.videoUrl}
            poster={posterUrlForVideoUrl(demo.videoUrl)}
            className="block w-full max-h-[60vh] object-cover lg:max-h-[72vh]"
            style={{ aspectRatio: String(Math.max(featureVideoAspectRatio(demo), 0.62)) }}
            muted
            loop
            playsInline
            preload={preview ? "metadata" : "none"}
            aria-label={demo.title || `Demostración de ${title}`}
            {...backgroundSoundProps}
          />
        ) : (
          <img
            src={getProductPosterUrl(product.image_url, product.slug)}
            alt={product.name}
            loading={preview ? undefined : "lazy"}
            className="block aspect-4/5 w-full object-cover"
          />
        )}
        <ProductSaleBadge product={product} />
        {demo && !preview ? <BackgroundSoundButton containerRef={mediaRef} className="z-2" /> : null}
      </div>
      {demo?.title ? (
        <p className="mt-3 text-center text-xs uppercase tracking-[0.2em] text-carbon/50">{demo.title}</p>
      ) : null}
    </div>
  );

  const ctaLabel = addToCartDisabled ? "Próximamente" : outOfStock ? "Sin stock" : config.ctaText;
  const primaryCta =
    needsColor && !outOfStock && !addToCartDisabled ? (
      // Con colores hay que elegir uno en la ficha antes de añadir.
      <Link to={productHref} className={cn(SITE_CTA_CLASS, "w-full sm:w-auto")} style={heroCtaStyle}>
        <ShoppingBag size={16} aria-hidden />
        Elegir color
      </Link>
    ) : (
      <Button
        type="button"
        onClick={preview ? undefined : onAddToCart}
        disabled={!preview && (addToCartDisabled || outOfStock)}
        className={cn(SITE_CTA_CLASS, "w-full sm:w-auto", preview && "pointer-events-none")}
        style={heroCtaStyle}
      >
        <ShoppingBag size={16} aria-hidden />
        {ctaLabel}
      </Button>
    );

  const body = (
    <div className="text-left">
      {config.description ? (
        <p className="text-base leading-relaxed text-carbon/75 text-center lg:text-left">{config.description}</p>
      ) : null}
      {config.benefits.length > 0 ? (
        <ul className="mt-6 space-y-3">
          {config.benefits.map((benefit, index) => (
            <li key={`${index}-${benefit}`} className="flex items-start gap-3 text-[0.95rem] leading-snug text-carbon/85">
              <span className="mt-0.5 text-gold shrink-0" aria-hidden>
                ✦
              </span>
              <span>{benefit}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:flex-wrap lg:items-center">
        <ProductPriceDisplay product={product} size="lg" muted={outOfStock} />
        {primaryCta}
      </div>
      {config.secondaryCtaText ? (
        <div className="mt-5 text-center sm:text-left">
          {preview ? (
            <span className="inline-flex items-center gap-2 text-sm font-medium text-gold">
              {config.secondaryCtaText}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </span>
          ) : (
            <Link
              to={productHref}
              className="inline-flex items-center gap-2 text-sm font-medium tracking-wide text-gold hover:underline underline-offset-4"
            >
              {config.secondaryCtaText}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          )}
        </div>
      ) : null}
    </div>
  );

  // Móvil: título, demostración y compra, en ese orden. Escritorio: vídeo a la izquierda.
  const content = (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 lg:grid-cols-2 lg:grid-rows-[auto_1fr] lg:gap-x-16 lg:gap-y-6">
      <div className="lg:col-start-2 lg:row-start-1 lg:self-end">{header}</div>
      <div className="lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:self-center">{media}</div>
      <div className="lg:col-start-2 lg:row-start-2">{body}</div>
    </div>
  );

  return (
    <section
      aria-labelledby={preview ? undefined : "elixir-spotlight-title"}
      className="py-16 md:py-24"
      style={{ backgroundColor: SECTION_BG }}
    >
      <div className="container mx-auto px-6">
        {preview ? content : <AnimatedSection>{content}</AnimatedSection>}
      </div>
    </section>
  );
}

async function fetchSpotlightProduct(slug: string): Promise<CatalogProduct | null> {
  const { data, error } = await (supabase as any).from("products").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data ?? null;
}

/**
 * «Producto protagonista» (Elixir). En la home recibe el producto ya cargado;
 * en el resto de páginas lo pide por su slug.
 */
const ElixirSpotlight = ({ product: givenProduct }: { product?: CatalogProduct | null }) => {
  const config = useElixirSpotlight();
  const { addItem, isAddToCartDisabled } = useCart();
  const { data: fetchedProduct } = useQuery({
    queryKey: ["spotlight-product", config.productSlug],
    queryFn: () => fetchSpotlightProduct(config.productSlug),
    enabled: config.enabled && givenProduct === undefined,
    staleTime: 5 * 60_000,
  });
  const product = givenProduct === undefined ? fetchedProduct : givenProduct;

  if (!config.enabled || !product) return null;

  return (
    <ElixirSpotlightView
      config={config}
      product={product}
      onAddToCart={() => addItem(toCartProduct(product))}
      addToCartDisabled={isAddToCartDisabled}
    />
  );
};

export default ElixirSpotlight;
