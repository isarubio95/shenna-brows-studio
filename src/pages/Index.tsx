import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import AnimatedSection from "@/components/AnimatedSection";
import TestimonialsCarousel from "@/components/TestimonialsCarousel";
import { motion } from "framer-motion";
import Autoplay from "embla-carousel-autoplay";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { getProductImageUrl } from "@/lib/product-images";
import { ProductPriceDisplay } from "@/components/ProductPriceDisplay";
import { ProductSaleBadge } from "@/components/ProductSaleBadge";
import CeoSection from "@/components/CeoSection";
import { useSiteContent } from "@/hooks/use-site-content";
import { parseMarqueeConfig } from "@/lib/marquee-content";
import {
  parseCollectionHeadlineConfig,
  splitHeadlineByAccent,
} from "@/lib/collection-headline-content";

/** Variantes optimizadas en /public/hero — el navegador solo descarga la que coincida con el viewport. */
const HERO_IMAGES = {
  sm: { avif: "/hero/hero-sm.avif", webp: "/hero/hero-sm.webp", jpg: "/hero/hero-sm.jpg" },
  md: { avif: "/hero/hero-md.avif", webp: "/hero/hero-md.webp", jpg: "/hero/hero-md.jpg" },
  lg: { avif: "/hero/hero-lg.avif", webp: "/hero/hero-lg.webp", jpg: "/hero/hero-lg.jpg" },
  xl: { avif: "/hero/hero-xl.avif", webp: "/hero/hero-xl.webp", jpg: "/hero/hero-xl.jpg" },
} as const;

/** Estilos compartidos del CTA del hero (tamaño / tipografía). */
const HERO_CTA_BASE =
  "text-[0.65rem] tracking-[0.22em] uppercase px-6 sm:px-7 py-3 transition-all duration-300 active:scale-95 font-sans";

/** CTA activo: crema opaco (referencia de diseño). */
const HERO_CTA_SOLID = `${HERO_CTA_BASE} border border-[#F7F2E6] bg-[#F7F2E6] text-[#8F7F5D] hover:bg-[#EFE7D4] hover:border-[#EFE7D4]`;

/**
 * Alternativa previa (vidrio translúcido blanco).
 * Para volver a ella: usa `HERO_CTA_GLASS` en el botón del hero en lugar de `HERO_CTA_SOLID`.
 */
const HERO_CTA_GLASS = `${HERO_CTA_BASE} border border-white/80 bg-white/15 backdrop-blur-sm text-white hover:bg-white/25`;

const Index = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: siteContent } = useSiteContent(["index_marquee", "index_collection_headline"]);

  const marquee = useMemo(
    () => parseMarqueeConfig(siteContent.index_marquee?.content),
    [siteContent.index_marquee?.content],
  );

  const collectionHeadline = useMemo(
    () => parseCollectionHeadlineConfig(siteContent.index_collection_headline?.content),
    [siteContent.index_collection_headline?.content],
  );

  const headlineParts = useMemo(
    () => splitHeadlineByAccent(collectionHeadline.text, collectionHeadline.accent),
    [collectionHeadline.text, collectionHeadline.accent],
  );

  const productsAutoplay = useMemo(
    () => Autoplay({ delay: 4000, stopOnInteraction: true }),
    [],
  );

  useEffect(() => {
    (supabase as any).from("products").select("*").order("name").then(({ data }: any) => {
      setProducts(data || []);
      setLoading(false);
    });
  }, []);

  const scrollToNextSection = () => {
    document.getElementById("coleccion")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main>
      {/* Hero */}
      <section className="relative w-full min-h-dvh flex flex-col items-start justify-center px-4 sm:px-6 overflow-hidden pt-24 pb-12">
        {/* Fondo: picture + media — el navegador solo descarga la variante del viewport */}
        <picture className="absolute inset-0 z-0 pointer-events-none">
          <source media="(max-width: 639px)" type="image/avif" srcSet={HERO_IMAGES.sm.avif} />
          <source media="(max-width: 639px)" type="image/webp" srcSet={HERO_IMAGES.sm.webp} />
          <source media="(max-width: 639px)" type="image/jpeg" srcSet={HERO_IMAGES.sm.jpg} />
          <source media="(max-width: 1023px)" type="image/avif" srcSet={HERO_IMAGES.md.avif} />
          <source media="(max-width: 1023px)" type="image/webp" srcSet={HERO_IMAGES.md.webp} />
          <source media="(max-width: 1023px)" type="image/jpeg" srcSet={HERO_IMAGES.md.jpg} />
          <source media="(max-width: 1535px)" type="image/avif" srcSet={HERO_IMAGES.lg.avif} />
          <source media="(max-width: 1535px)" type="image/webp" srcSet={HERO_IMAGES.lg.webp} />
          <source media="(max-width: 1535px)" type="image/jpeg" srcSet={HERO_IMAGES.lg.jpg} />
          <source type="image/avif" srcSet={HERO_IMAGES.xl.avif} />
          <source type="image/webp" srcSet={HERO_IMAGES.xl.webp} />
          <img
            src={HERO_IMAGES.lg.jpg}
            alt=""
            width={2640}
            height={1470}
            decoding="async"
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover max-lg:object-[center_calc(50%+4rem)] lg:object-[55%_35%]"
          />
        </picture>

        {/* Overlay de degradado para aclarar la parte superior y dar profundidad abajo */}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.35)_0%,rgba(0,0,0,0.18)_10%,transparent_25%,transparent_70%,rgba(0,0,0,0.18)_100%)] z-[1] pointer-events-none" />

        {/* Center content */}
        <div className="relative z-[2] w-full max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row items-start justify-between gap-8 lg:gap-12">
            <div className="w-full lg:w-[58%] flex flex-col items-start pb-14 lg:pb-0">
              <AnimatedSection>
                <h1 className="font-playfair font-normal text-[#F7F0E2] text-[1.7rem] md:text-[2.1rem] lg:text-[3rem] text-left tracking-[0.05em] uppercase leading-[1.35] mb-8 drop-shadow-[0_1px_6px_rgba(0,0,0,0.25)]">
                  <span className="block">La precisión</span>
                  <span className="block">
                    Que te{" "}
                    <span className="italic">
                      define
                    </span>
                  </span>
                </h1>
              </AnimatedSection>

              <AnimatedSection delay={0.15}>
                <Link to="/tienda">
                  <button className={HERO_CTA_SOLID}>
                    DESCUBRIR LA COLECCIÓN
                  </button>
                </Link>
              </AnimatedSection>
            </div>
          </div>
        </div>

        {/* Bottom section */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[3]">
          <AnimatedSection delay={0.3}>
            <motion.button
              type="button"
              onClick={scrollToNextSection}
              aria-label="Bajar a la siguiente sección"
              animate={{ y: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="mb-3 sm:mb-4 text-white/90 hover:text-white transition-colors duration-300 flex items-center justify-center"
            >
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" className="mx-auto drop-shadow-[0_4px_8px_rgba(0,0,0,0.35)]">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </motion.button>
          </AnimatedSection>
        </div>
      </section>

      {/* Marquesina */}
      <div
        className="relative overflow-hidden border-y border-carbon/10"
        style={{
          backgroundColor: marquee.background,
          paddingTop: marquee.paddingY,
          paddingBottom: marquee.paddingY,
        }}
        aria-hidden="true"
      >
        <div className="flex w-max animate-marquee motion-reduce:animate-none">
          {[0, 1].map((copy) => (
            <ul
              key={copy}
              className="flex shrink-0 items-center gap-8 px-4 sm:gap-12"
            >
              {marquee.items.map((item, i) => (
                <li
                  key={`${copy}-${i}-${item}`}
                  className="flex shrink-0 items-center gap-8 sm:gap-12"
                >
                  <span className="whitespace-nowrap font-sans text-[0.65rem] font-medium uppercase tracking-[0.28em] text-carbon/70 sm:text-xs">
                    {item}
                  </span>
                  <span className="h-1 w-1 shrink-0 rounded-full bg-gold/80" aria-hidden />
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <section
        id="coleccion"
        className="py-20 md:py-24"
        style={{ backgroundColor: "#F8F3EB" }}
      >
        <div className="container mx-auto px-6">
          <AnimatedSection>
            <p
              className="font-playfair text-center leading-snug mb-10 md:mb-14"
              style={{
                color: collectionHeadline.color,
                fontSize: `clamp(1.35rem, 2.5vw + 0.75rem, ${collectionHeadline.fontSize}px)`,
              }}
            >
              {headlineParts ? (
                <>
                  {headlineParts.before}
                  <span className="italic" style={{ color: collectionHeadline.accentColor }}>
                    {headlineParts.accent}
                  </span>
                  {headlineParts.after}
                </>
              ) : (
                collectionHeadline.text
              )}
            </p>
            <h2 className="font-playfair text-3xl md:text-4xl font-bold text-center mb-4" style={{ color: "var(--theme-color-h2, #1A1A1A)" }}>
              Nuestra colección
            </h2>
            <p className="text-center mb-12 md:mb-16 max-w-lg mx-auto" style={{ color: "var(--theme-color-paragraph, #1A1A1A)", opacity: 0.6 }}>
              Cinco herramientas esenciales para la artista que busca perfección.
            </p>
          </AnimatedSection>
          <AnimatedSection delay={0.1}>
            <Carousel
              plugins={loading ? undefined : [productsAutoplay]}
              opts={{ align: "start", loop: false, containScroll: "trimSnaps" }}
              className="w-full md:px-12 lg:px-16"
            >
              <CarouselContent className="-ml-4">
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <CarouselItem
                        key={i}
                        className="pl-4 basis-[88%] sm:basis-[55%] md:basis-[42%] lg:basis-[33%] xl:basis-[27%]"
                      >
                        <div className="bg-white rounded-2xl overflow-hidden h-full">
                          <Skeleton className="aspect-square" />
                          <div className="p-6 space-y-2">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-6 w-40" />
                            <Skeleton className="h-4 w-32" />
                          </div>
                        </div>
                      </CarouselItem>
                    ))
                  : products.map((product) => (
                      <CarouselItem
                        key={product.id}
                        className="pl-4 basis-[88%] sm:basis-[55%] md:basis-[42%] lg:basis-[33%] xl:basis-[27%]"
                      >
                        <Link to={`/${product.slug}`} className="block h-full">
                          <motion.div
                            whileHover={{ y: -8 }}
                            transition={{ duration: 0.3 }}
                            className="group h-full bg-white rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] transition-shadow duration-500 flex flex-col"
                          >
                            <div className="relative aspect-square bg-muted overflow-hidden">
                              <ProductSaleBadge product={product} />
                              <img
                                src={getProductImageUrl(product.image_url, product.slug)}
                                alt={product.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                loading="lazy"
                              />
                            </div>
                            <div className="p-6 flex-1 flex flex-col justify-between">
                              <div>
                                <p className="text-gold text-xs uppercase tracking-[0.2em] font-medium mb-2">
                                  {product.category}
                                </p>
                                <h3 className="font-playfair text-xl font-semibold text-carbon mb-1">
                                  {product.name}
                                </h3>
                                <p className="text-sm text-carbon/50">{product.tagline}</p>
                              </div>
                              <ProductPriceDisplay product={product} className="mt-4" />
                            </div>
                          </motion.div>
                        </Link>
                      </CarouselItem>
                    ))}
              </CarouselContent>
              <CarouselPrevious className="hidden md:flex h-10 w-10 lg:-left-14 border-gold/20 text-gold hover:bg-gold/10 hover:text-gold bg-white/80 backdrop-blur-sm [&_svg]:h-5 [&_svg]:w-5" />
              <CarouselNext className="hidden md:flex h-10 w-10 lg:-right-14 border-gold/20 text-gold hover:bg-gold/10 hover:text-gold bg-white/80 backdrop-blur-sm [&_svg]:h-5 [&_svg]:w-5" />
            </Carousel>
          </AnimatedSection>
        </div>
      </section>

      {/* CEO */}
      <CeoSection />

      {/* Testimonials */}
      <TestimonialsCarousel />
    </main>
  );
};

export default Index;