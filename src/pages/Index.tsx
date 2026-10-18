import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import AnimatedSection from "@/components/AnimatedSection";
import TestimonialsBanner from "@/components/TestimonialsBanner";
import PromoCodeBanner from "@/components/PromoCodeBanner";

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
import TrustStrip from "@/components/TrustStrip";
import BrandValues from "@/components/BrandValues";
import ValueProposition from "@/components/ValueProposition";
import CollectionIntro from "@/components/CollectionIntro";
import {
  COLLECTION_INTRO_CONTENT_KEY,
  parseCollectionIntroConfig,
} from "@/lib/collection-intro-content";
import ElixirSpotlight from "@/components/ElixirSpotlight";
import ReviewsCarousel from "@/components/ReviewsCarousel";
import ProductGrid from "@/components/ProductGrid";
import type { CatalogProduct } from "@/components/ProductCard";
import { useCart } from "@/context/CartContext";
import { useElixirSpotlight } from "@/hooks/use-elixir-spotlight";
import { toCartProduct } from "@/lib/cart-product";
import { featuredFirst } from "@/lib/featured-product";
import {
  TESTIMONIALS_BANNER_CONTENT_KEY,
  parseTestimonialsBannerConfig,
} from "@/lib/testimonials-banner-content";
import {
  PROMO_CODE_BANNER_CONTENT_KEY,
  parsePromoCodeBannerConfig,
} from "@/lib/promo-code-banner-content";

const Index = () => {
  const navigate = useNavigate();
  const { addItem, isAddToCartDisabled } = useCart();
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const spotlight = useElixirSpotlight();
  const { data: siteContent, loading: siteContentLoading } = useSiteContent([
    "index_hero",
    "index_marquee",
    "index_video",
    "index_collection_headline",
    "index_campaign",
    PROMO_CODE_BANNER_CONTENT_KEY,
    TESTIMONIALS_BANNER_CONTENT_KEY,
    COLLECTION_INTRO_CONTENT_KEY,
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

  const collectionIntroContent = siteContent[COLLECTION_INTRO_CONTENT_KEY]?.content;
  const collectionIntro = useMemo(
    () => parseCollectionIntroConfig(collectionIntroContent),
    [collectionIntroContent],
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

  useEffect(() => {
    (supabase as any).from("products").select("*").order("name").then(({ data }: any) => {
      setProducts(data || []);
      setLoading(false);
    });
  }, []);

  // Packs aparte (esquema de la clienta: packs y luego el resto de la colección),
  // con el producto protagonista siempre el primero.
  // Si el protagonista ya tiene su bloque, la colección muestra «el resto».
  const { spotlightProduct, packProducts, collectionProducts } = useMemo(() => {
    const ordered = featuredFirst(products, spotlight.productSlug);
    const featured = spotlight.enabled
      ? ordered.find((p) => p.slug === spotlight.productSlug) ?? null
      : null;
    const rest = featured ? ordered.filter((p) => p.id !== featured.id) : ordered;
    return {
      spotlightProduct: featured,
      packProducts: rest.filter((p) => p.is_pack),
      collectionProducts: rest.filter((p) => !p.is_pack),
    };
  }, [products, spotlight.enabled, spotlight.productSlug]);

  const openProduct = (slug: string) => navigate(`/${slug}`);
  const addToCart = (product: CatalogProduct) => addItem(toCartProduct(product));

  const scrollToNextSection = () => {
    document.getElementById("marquesina")?.scrollIntoView({ behavior: "smooth", block: "start" });
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
        id="marquesina"
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
                  <span className="whitespace-nowrap font-sans text-[0.65rem] font-medium uppercase tracking-[0.28em] sm:text-xs"
                    style={{ ...fontStyle(marquee.fonts.items), color: marquee.textColor }}
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

      {/* Esquema de la clienta: marquesina → confianza → valores → protagonista → colección. */}
      <TrustStrip />

      <ValueProposition />

      <BrandValues />

      {!loading && <ElixirSpotlight product={spotlightProduct} />}

      {/* Campaña antes que la colección (petición de la clienta). */}
      <CampaignBanner config={campaign} />

      <PromoCodeBanner config={promoCodeBanner} />

      {(loading || packProducts.length > 0) && (
        <section id="packs" className="py-16 md:py-24 bg-cream">
          <div className="container mx-auto px-6">
            <AnimatedSection>
              <div className="text-center mb-10">
                <p className="text-gold text-xs uppercase tracking-[0.28em] font-medium mb-3">Ahorra con</p>
                <h2 className="font-playfair text-3xl md:text-4xl font-bold">Nuestros packs</h2>
                <p className="text-carbon/60 max-w-xl mx-auto mt-3 text-sm md:text-base">
                  Combinaciones pensadas para ti y para las necesidades de tus cejas, para que encuentres todo lo que necesitas en un solo pack.
                </p>
              </div>
            </AnimatedSection>
            <ProductGrid
              variant="packs"
              products={packProducts}
              loading={loading}
              onOpenProduct={openProduct}
              onAddToCart={addToCart}
              addToCartDisabled={isAddToCartDisabled}
            />
          </div>
        </section>
      )}

      {/* Products Grid */}
      <section
        id="coleccion"
        className="py-20 md:py-24"
        style={{ backgroundColor: "#F8F3EB" }}
      >
        <div className="container mx-auto px-6">
          <AnimatedSection>
            <CollectionIntro config={collectionIntro} />
          </AnimatedSection>
          {/* Cuadrícula como la de los packs: nada que deslizar a los lados. */}
          <ProductGrid
            variant="products"
            products={collectionProducts}
            loading={loading}
            onOpenProduct={openProduct}
            onAddToCart={addToCart}
            addToCartDisabled={isAddToCartDisabled}
          />
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

      <ReviewsCarousel />

      {testimonialsReady ? <TestimonialsBanner config={testimonialsBanner} /> : null}

      <CeoSection />

      <IndexVideoSection config={indexVideo} />
    </main>
  );
};

export default Index;
