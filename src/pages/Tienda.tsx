import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { getProductPosterUrl } from "@/lib/product-images";
import ProductGrid from "@/components/ProductGrid";
import ElixirSpotlight from "@/components/ElixirSpotlight";
import { useCart } from "@/context/CartContext";
import AnimatedSection from "@/components/AnimatedSection";
import { Skeleton } from "@/components/ui/skeleton";
import { getEffectivePrice } from "@/lib/product-pricing";
import { toCartProduct } from "@/lib/cart-product";
import { featuredFirst } from "@/lib/featured-product";
import { useElixirSpotlight } from "@/hooks/use-elixir-spotlight";
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

const Tienda = () => {
  const navigate = useNavigate();
  const { addItem, isAddToCartDisabled } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: siteContent } = useSiteContent(["tienda_hero"]);
  const { productSlug: featuredSlug } = useElixirSpotlight();
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
    return {
      individualProducts: featuredFirst(individuals, featuredSlug),
      packProducts: featuredFirst(packs, featuredSlug),
    };
  }, [products, featuredSlug]);

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
          image: getProductPosterUrl(product.image_url, product.slug),
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
    addItem(toCartProduct(product));
  };

  return (
    <main className="min-h-screen bg-cream pt-36 pb-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <TiendaHero config={tiendaHero} />

      {/* El más vendido justo después de la cabecera, antes de los productos (clienta, 18/10). */}
      {!loading && (
        <div className="mt-12 md:mt-16">
          <ElixirSpotlight product={products.find((p) => p.slug === featuredSlug) ?? null} />
        </div>
      )}

      <section id="productos" className="container mx-auto px-6 mt-16">
        <AnimatedSection>
          <h2 className="font-playfair text-3xl md:text-4xl font-bold text-center text-carbon">Productos</h2>
          <p className="text-center text-carbon/60 max-w-2xl mx-auto mt-4 mb-10">
            Elige las herramientas y productos que cuidan tus cejas para lucirlas naturales, elegantes y definidas en el menor tiempo posible.
          </p>
        </AnimatedSection>

        {/* Como los packs: todos a la vista, sin deslizar a los lados. */}
        <ProductGrid
          variant="products"
          products={individualProducts}
          loading={loading}
          onOpenProduct={(nextSlug) => navigate(`/${nextSlug}`)}
          onAddToCart={handleAddToCart}
          addToCartDisabled={isAddToCartDisabled}
        />

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
                      Combinaciones pensadas para ti y para las necesidades de tus cejas, para que encuentres todo lo que necesitas en un solo pack.
                    </p>
                  </>
                )}
              </div>
            </AnimatedSection>

            <ProductGrid
              variant="packs"
              products={packProducts}
              loading={loading}
              onOpenProduct={(nextSlug) => navigate(`/${nextSlug}`)}
              onAddToCart={handleAddToCart}
              addToCartDisabled={isAddToCartDisabled}
            />
          </div>
        )}

      </section>
    </main>
  );
};

export default Tienda;
