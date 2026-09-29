import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import AnimatedSection from "@/components/AnimatedSection";
import TestimonialsBanner from "@/components/TestimonialsBanner";
import PromoCodeBanner from "@/components/PromoCodeBanner";
import Autoplay from "embla-carousel-autoplay";
import { motion } from "framer-motion";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { getProductImageUrl } from "@/lib/product-images";
import ProductMedia from "@/components/ProductMedia";
import { ProductPriceDisplay } from "@/components/ProductPriceDisplay";
import { ProductSaleBadge } from "@/components/ProductSaleBadge";
import CeoSection from "@/components/CeoSection";
import CampaignBanner from "@/components/CampaignBanner";
import HeroSection from "@/components/HeroSection";
import { useSiteContent } from "@/hooks/use-site-content";
import { parseMarqueeConfig } from "@/lib/marquee-content";
import { fontStyle } from "@/lib/fonts";
import { parseCollectionHeadlineConfig } from "@/lib/collection-headline-content";
import CollectionHeadline from "@/components/CollectionHeadline";
import { parseCampaignConfig } from "@/lib/campaign-content";
import { parseHeroConfig } from "@/lib/hero-content";
import { parseIndexVideoConfig } from "@/lib/video-content";
import IndexVideoSection from "@/components/IndexVideoSection";
import {
  TESTIMONIALS_BANNER_CONTENT_KEY,
  parseTestimonialsBannerConfig,
} from "@/lib/testimonials-banner-content";
import {
  PROMO_CODE_BANNER_CONTENT_KEY,
  parsePromoCodeBannerConfig,
} from "@/lib/promo-code-banner-content";

const Index = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: siteContent, loading: siteContentLoading } = useSiteContent([
    "index_hero",
    "index_marquee",
    "index_video",
    "index_collection_headline",
    "index_campaign",
    PROMO_CODE_BANNER_CONTENT_KEY,
    TESTIMONIALS_BANNER_CONTENT_KEY,
  ]);

  const hero = useMemo(
    () => parseHeroConfig(siteContent.index_hero?.content),
    [siteContent.index_hero?.content],
  );
  // Con caché, el hero de la admin está en el primer render. Sin ella, no se
  // pinta el de por defecto mientras llega el de la base de datos.
  const heroReady = Boolean(siteContent.index_hero?.content) || !siteContentLoading;

  const marquee = useMemo(
    () => parseMarqueeConfig(siteContent.index_marquee?.content),
    [siteContent.index_marquee?.content],
  );

  const indexVideo = useMemo(
    () => parseIndexVideoConfig(siteContent.index_video?.content),
    [siteContent.index_video?.content],
  );

  const collectionHeadline = useMemo(
    () => parseCollectionHeadlineConfig(siteContent.index_collection_headline?.content),
    [siteContent.index_collection_headline?.content],
  );

  const campaign = useMemo(
    () => parseCampaignConfig(siteContent.index_campaign?.content),
    [siteContent.index_campaign?.content],
  );

  const promoCodeContent = siteContent[PROMO_CODE_BANNER_CONTENT_KEY]?.content;
  const promoCodeBanner = useMemo(
    () => parsePromoCodeBannerConfig(promoCodeContent),
    [promoCodeContent],
  );

  const testimonialsContent = siteContent[TESTIMONIALS_BANNER_CONTENT_KEY]?.content;
  const testimonialsBanner = useMemo(
    () => parseTestimonialsBannerConfig(testimonialsContent),
    [testimonialsContent],
  );
  // Igual que el hero: sin caché no se pinta la versión por defecto mientras
  // llega la de la base de datos.
  const testimonialsReady = Boolean(testimonialsContent) || !siteContentLoading;

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
      <HeroSection
        config={hero}
        ready={heroReady}
        onScrollNext={scrollToNextSection}
      />

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
                  <span className="whitespace-nowrap font-sans text-[0.65rem] font-medium uppercase tracking-[0.28em] text-carbon/70 sm:text-xs"
                    style={fontStyle(marquee.fonts.items)}
                  >
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
            <h2 className="font-playfair text-3xl md:text-4xl font-bold text-center mb-4" style={{ color: "var(--theme-color-h2, #1A1A1A)" }}>
              Nuestra colección
            </h2>
            <p className="text-center mb-12 md:mb-16 max-w-lg mx-auto" style={{ color: "var(--theme-color-paragraph, #1A1A1A)", opacity: 0.6 }}>
              Todo lo que necesitas para cuidar, definir y realzar tus cejas, con la precisión de la experiencia profesional.
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
                              <ProductMedia
                                src={getProductImageUrl(product.image_url, product.slug)}
                                alt={product.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                              />
                            </div>
                            <div className="p-6 flex-1 flex flex-col justify-between">
                              <div>
                                <p className="text-gold text-xs uppercase tracking-[0.2em] font-medium mb-2">
                                  {product.category}
                                </p>
                                <h3 className="product-card-title font-playfair text-xl font-semibold text-carbon mb-1">
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

      <section
        aria-label="Titular de la colección"
        className="py-16 md:py-24"
        style={{ backgroundColor: collectionHeadline.background }}
      >
        <div className="container mx-auto px-6">
          <AnimatedSection>
            <CollectionHeadline
              config={collectionHeadline}
              fontSize={`clamp(2.25rem, 7vw, ${collectionHeadline.fontSize}px)`}
            />
          </AnimatedSection>
        </div>
      </section>

      <CampaignBanner config={campaign} />

      <PromoCodeBanner config={promoCodeBanner} />

      {testimonialsReady ? <TestimonialsBanner config={testimonialsBanner} /> : null}

      <CeoSection />

      <IndexVideoSection config={indexVideo} />
    </main>
  );
};

export default Index;
