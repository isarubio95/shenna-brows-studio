import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShoppingCart, Plus, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import Autoplay from "embla-carousel-autoplay";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { getProductImageGallery, getProductImageUrl } from "@/lib/product-images";
import { useCart } from "@/context/CartContext";
import AnimatedSection from "@/components/AnimatedSection";
import { ProductPriceDisplay } from "@/components/ProductPriceDisplay";
import { ProductSaleBadge } from "@/components/ProductSaleBadge";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";
import { getEffectivePrice } from "@/lib/product-pricing";
import { useSiteContent } from "@/hooks/use-site-content";
import { parseTiendaHeroConfig } from "@/lib/tienda-hero-content";
import TiendaHero from "@/components/TiendaHero";

type Product = Database["public"]["Tables"]["products"]["Row"];

const SEO_TITLE = "Tienda Shenna Brows | Herramientas profesionales para cejas";
const SEO_DESCRIPTION =
  "Compra herramientas profesionales para cejas: pinzas, tijeras, espuma y más. Calidad premium, precisión extrema y envío rápido para resultados impecables.";

const setMetaTag = (key: string, value: string, useProperty = false) => {
  const selector = useProperty ? `meta[property="${key}"]` : `meta[name="${key}"]`;
  let tag = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!tag) {
    tag = document.createElement("meta");
    if (useProperty) {
      tag.setAttribute("property", key);
    } else {
      tag.setAttribute("name", key);
    }
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", value);
};

const setCanonical = (href: string) => {
  let tag = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!tag) {
    tag = document.createElement("link");
    tag.setAttribute("rel", "canonical");
    document.head.appendChild(tag);
  }
  tag.setAttribute("href", href);
};

const stripHtml = (value: string | null) => (value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

interface ProductCardProps {
  product: Product;
  delay: number;
  onOpenProduct: (slug: string) => void;
  onAddToCart: (product: Product) => void;
  addToCartDisabled: boolean;
  /** Tarjeta resaltada para la sección de packs. */
  featured?: boolean;
}

const ProductCard = ({ product, delay, onOpenProduct, onAddToCart, addToCartDisabled, featured }: ProductCardProps) => {
  const gallery = getProductImageGallery(product.image_url, product.slug);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const outOfStock = Number(product.stock ?? 0) <= 0;

  const goPrevImage = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setCurrentImageIndex((prev) => (prev === 0 ? gallery.length - 1 : prev - 1));
  };

  const goNextImage = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setCurrentImageIndex((prev) => (prev === gallery.length - 1 ? 0 : prev + 1));
  };

  return (
    <AnimatedSection key={product.id} delay={delay} className="h-full">
      <motion.article
        whileHover={{ y: outOfStock ? -2 : -8 }}
        transition={{ duration: 0.3 }}
        className={`h-full rounded-2xl overflow-hidden border shadow-[0_6px_24px_rgba(0,0,0,0.05)] hover:shadow-[0_14px_40px_rgba(0,0,0,0.1)] transition-shadow duration-500 flex flex-col cursor-pointer ${
          outOfStock
            ? "bg-cream/80 border-carbon/20 ring-1 ring-carbon/10 opacity-[0.97]"
            : featured
              ? "bg-[linear-gradient(145deg,#fffef8_0%,#ffffff_45%,#fff9ec_100%)] border-gold/35 ring-1 ring-gold/25"
              : "bg-white border-gold/10"
        }`}
        role="link"
        tabIndex={0}
        onClick={() => onOpenProduct(product.slug)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpenProduct(product.slug);
          }
        }}
      >
        <Link to={`/${product.slug}`} className="relative block aspect-square bg-muted overflow-hidden">
          <ProductSaleBadge
            product={product}
            className={featured ? "left-3 top-12" : undefined}
          />
          {featured && (
            <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-gold px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white shadow-md">
              <Sparkles size={12} aria-hidden />
              Pack
            </span>
          )}
          {outOfStock && (
            <span className="absolute right-3 top-3 z-10 rounded-full bg-carbon px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white shadow-md">
              Sin stock
            </span>
          )}
          <img
            src={gallery[currentImageIndex]}
            alt={`${product.name} - Shenna Brows`}
            className={`w-full h-full object-cover transition-transform duration-700 ${
              outOfStock ? "grayscale-[0.4] opacity-90" : "hover:scale-105"
            }`}
            loading="lazy"
          />
          {gallery.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Foto anterior"
                onClick={goPrevImage}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-carbon rounded-full p-1.5 shadow"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                aria-label="Siguiente foto"
                onClick={goNextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-carbon rounded-full p-1.5 shadow"
              >
                <ChevronRight size={16} />
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                {gallery.map((_, index) => (
                  <button
                    key={`${product.id}-dot-${index}`}
                    type="button"
                    aria-label={`Ver foto ${index + 1}`}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setCurrentImageIndex(index);
                    }}
                    className={`h-1.5 rounded-full transition-all ${
                      index === currentImageIndex ? "w-5 bg-white" : "w-2 bg-white/70"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </Link>

        <div className="p-6 flex-1 flex flex-col justify-between">
          <div>
            <p className="text-gold text-xs uppercase tracking-[0.2em] font-medium mb-2">{product.category}</p>
            <h3 className="product-card-title font-playfair text-xl font-semibold text-carbon mb-1">{product.name}</h3>
            <p className="text-sm text-carbon/60">{product.tagline}</p>
          </div>

          <div className="mt-5">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-4">
              <ProductPriceDisplay product={product} muted={outOfStock} />
              {outOfStock && !addToCartDisabled && (
                <span className="text-xs font-semibold uppercase tracking-wider text-carbon/55">No disponible</span>
              )}
            </div>
            <div className="flex">
              <Button
                className={
                  outOfStock && !addToCartDisabled
                    ? "w-full border-carbon/20 bg-carbon/5 text-carbon/50 hover:bg-carbon/5"
                    : "w-full bg-gold hover:bg-gold/90 text-white"
                }
                variant={outOfStock && !addToCartDisabled ? "outline" : "default"}
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToCart(product);
                }}
                disabled={addToCartDisabled || outOfStock}
              >
                {addToCartDisabled ? (
                  <>
                    <span className="relative mr-2 inline-flex">
                      <ShoppingCart size={16} />
                      <Plus size={11} className="absolute -top-1 -right-1" />
                    </span>
                    Próximamente
                  </>
                ) : outOfStock ? (
                  "Sin stock"
                ) : (
                  <>
                    <span className="relative mr-2 inline-flex">
                      <ShoppingCart size={16} />
                      <Plus size={11} className="absolute -top-1 -right-1" />
                    </span>
                    Añadir
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </motion.article>
    </AnimatedSection>
  );
};

const Tienda = () => {
  const navigate = useNavigate();
  const { addItem, isAddToCartDisabled } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: siteContent } = useSiteContent(["tienda_hero"]);
  const tiendaHero = useMemo(
    () => parseTiendaHeroConfig(siteContent.tienda_hero?.content),
    [siteContent.tienda_hero?.content],
  );

  useEffect(() => {
    document.title = SEO_TITLE;
    setMetaTag("description", SEO_DESCRIPTION);
    setMetaTag("robots", "index, follow");
    setMetaTag("og:title", SEO_TITLE, true);
    setMetaTag("og:description", SEO_DESCRIPTION, true);
    setMetaTag("og:type", "website", true);
    setMetaTag("twitter:card", "summary_large_image");
    setCanonical(`${window.location.origin}/tienda`);
  }, []);

  useEffect(() => {
    (supabase as any)
      .from("products")
      .select("*")
      .order("name")
      .then(({ data }: { data: Product[] | null }) => {
        setProducts(data || []);
        setLoading(false);
      });
  }, []);

  const { individualProducts, packProducts } = useMemo(() => {
    const individuals: Product[] = [];
    const packs: Product[] = [];
    for (const p of products) {
      (p.is_pack ? packs : individuals).push(p);
    }
    const byName = (a: Product, b: Product) => a.name.localeCompare(b.name, "es");
    individuals.sort(byName);
    packs.sort(byName);
    return { individualProducts: individuals, packProducts: packs };
  }, [products]);

  const productsAutoplay = useMemo(
    () => Autoplay({ delay: 4500, stopOnInteraction: true }),
    [],
  );

  const catalogForSeo = useMemo(
    () => [...individualProducts, ...packProducts],
    [individualProducts, packProducts],
  );

  const jsonLd = useMemo(() => {
    const baseUrl = window.location.origin;
    return {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Catalogo Shenna Brows",
      description: SEO_DESCRIPTION,
      itemListElement: catalogForSeo.map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "Product",
          name: product.name,
          description: stripHtml(product.description) || product.tagline || "",
          image: getProductImageUrl(product.image_url, product.slug),
          brand: { "@type": "Brand", name: "Shenna Brows" },
          offers: {
            "@type": "Offer",
            priceCurrency: "EUR",
            price: getEffectivePrice(product).toFixed(2),
            availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            url: `${baseUrl}/${product.slug}`,
          },
        },
      })),
    };
  }, [catalogForSeo]);

  const handleAddToCart = (product: Product) => {
    addItem({
      id: product.id,
      name: product.name,
      slug: product.slug,
      category: product.category,
      price: getEffectivePrice(product),
      stock: product.stock,
      image_url: product.image_url,
      description: product.description,
      materials: product.materials,
      shipping_info: product.shipping_info,
      tagline: product.tagline,
      stripe_price_id: product.stripe_price_id,
    });
  };

  return (
    <main className="min-h-screen bg-cream pt-28 pb-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <TiendaHero config={tiendaHero} />

      <section id="productos" className="container mx-auto px-6 mt-16">
        <AnimatedSection>
          <h2 className="font-playfair text-3xl md:text-4xl font-bold text-center text-carbon">Productos</h2>
          <p className="text-center text-carbon/60 max-w-2xl mx-auto mt-4 mb-10">
            Elige la herramienta ideal para elevar tu tecnica y potenciar el resultado de cada diseno.
          </p>
        </AnimatedSection>

        <div className="relative md:px-12 lg:px-16">
          <Carousel
            plugins={loading ? undefined : [productsAutoplay]}
            opts={{ align: "start", loop: false, containScroll: "trimSnaps" }}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <CarouselItem
                      key={i}
                      className="pl-4 basis-[88%] sm:basis-[55%] lg:basis-[40%] xl:basis-[31%]"
                    >
                      <div className="bg-white rounded-2xl overflow-hidden border border-gold/10 h-full">
                        <Skeleton className="aspect-square" />
                        <div className="p-6 space-y-3">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-6 w-36" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-10 w-full mt-4" />
                        </div>
                      </div>
                    </CarouselItem>
                  ))
                : individualProducts.map((product, i) => (
                    <CarouselItem
                      key={product.id}
                      className="pl-4 basis-[88%] sm:basis-[55%] lg:basis-[40%] xl:basis-[31%]"
                    >
                      <ProductCard
                        product={product}
                        delay={i * 0.06}
                        onOpenProduct={(nextSlug) => navigate(`/${nextSlug}`)}
                        onAddToCart={handleAddToCart}
                        addToCartDisabled={isAddToCartDisabled}
                      />
                    </CarouselItem>
                  ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex h-10 w-10 lg:-left-14 border-gold/20 text-gold hover:bg-gold/10 hover:text-gold bg-white/90 [&_svg]:h-5 [&_svg]:w-5" />
            <CarouselNext className="hidden md:flex h-10 w-10 lg:-right-14 border-gold/20 text-gold hover:bg-gold/10 hover:text-gold bg-white/90 [&_svg]:h-5 [&_svg]:w-5" />
          </Carousel>
        </div>

        {(loading || packProducts.length > 0) && (
          <div id={loading ? undefined : "packs-destacados"} className="mt-20 md:mt-24">
            <AnimatedSection>
              <div className="text-center mb-10">
                {loading ? (
                  <div className="space-y-3 max-w-xl mx-auto">
                    <Skeleton className="h-3 w-28 mx-auto rounded-full" />
                    <Skeleton className="h-9 w-40 mx-auto" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-[85%] max-w-md mx-auto" />
                  </div>
                ) : (
                  <>
                    <p className="text-gold text-xs uppercase tracking-[0.28em] font-medium mb-3">Destacados</p>
                    <h2 className="font-playfair text-3xl md:text-4xl font-bold text-carbon">Packs</h2>
                    <p className="text-carbon/60 max-w-xl mx-auto mt-3 text-sm md:text-base">
                      Combinaciones pensadas para quien quiere equiparse de una vez y ahorrar frente a la compra por separado.
                    </p>
                  </>
                )}
              </div>
            </AnimatedSection>

            <div className="rounded-3xl border border-gold/25 bg-[radial-gradient(ellipse_at_top,rgba(197,160,89,0.12),transparent_55%),linear-gradient(to_bottom,#fffdf8,#ffffff)] p-6 sm:p-10 shadow-[0_12px_40px_rgba(0,0,0,0.06)]">
              <div
                className={
                  !loading && packProducts.length === 1
                    ? "grid grid-cols-1 gap-8 max-w-lg mx-auto w-full"
                    : "grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto"
                }
              >
                {loading
                  ? Array.from({ length: 2 }).map((_, i) => (
                      <div key={`pack-skel-${i}`} className="bg-white/80 rounded-2xl overflow-hidden border border-gold/15">
                        <Skeleton className="aspect-square" />
                        <div className="p-6 space-y-3">
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-6 w-40" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-10 w-full mt-4" />
                        </div>
                      </div>
                    ))
                  : packProducts.map((product, i) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        delay={i * 0.08}
                        onOpenProduct={(nextSlug) => navigate(`/${nextSlug}`)}
                        onAddToCart={handleAddToCart}
                        addToCartDisabled={isAddToCartDisabled}
                        featured
                      />
                    ))}
              </div>
            </div>
          </div>
        )}

      </section>
    </main>
  );
};

export default Tienda;
