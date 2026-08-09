import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import AnimatedSection from "@/components/AnimatedSection";
import TestimonialsCarousel from "@/components/TestimonialsCarousel";
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
import { ProductPriceDisplay } from "@/components/ProductPriceDisplay";
import { ProductSaleBadge } from "@/components/ProductSaleBadge";
import CeoSection from "@/components/CeoSection";
import CampaignBanner from "@/components/CampaignBanner";
import HeroSection from "@/components/HeroSection";
import { useSiteContent } from "@/hooks/use-site-content";
import { parseMarqueeConfig } from "@/lib/marquee-content";
import {
  parseCollectionHeadlineConfig,
  splitHeadlineByAccent,
} from "@/lib/collection-headline-content";
import { parseCampaignConfig } from "@/lib/campaign-content";
import { parseHeroConfig } from "@/lib/hero-content";

const Index = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: siteContent } = useSiteContent([
    "index_hero",
    "index_marquee",
    "index_collection_headline",
    "index_campaign",
  ]);

  const hero = useMemo(
    () => parseHeroConfig(siteContent.index_hero?.content),
    [siteContent.index_hero?.content],
  );

  const marquee = useMemo(
    () => parseMarqueeConfig(siteContent.index_marquee?.content),
    [siteContent.index_marquee?.content],
  );

  const collectionHeadline = useMemo(
    () => parseCollectionHeadlineConfig(siteContent.index_collection_headline?.content),
    [siteContent.index_collection_headline?.content],
  );

  const campaign = useMemo(
    () => parseCampaignConfig(siteContent.index_campaign?.content),
    [siteContent.index_campaign?.content],
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
      <HeroSection config={hero} onScrollNext={scrollToNextSection} />

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
              className="font-cormorant text-center leading-snug mb-10 md:mb-14"
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

      <CampaignBanner config={campaign} />

      <CeoSection />

      <TestimonialsCarousel />
    </main>
  );
};

export default Index;
