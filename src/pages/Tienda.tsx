import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, ShoppingBag, ShoppingCart, Plus, Truck, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { getProductImageUrl } from "@/lib/product-images";
import { useCart } from "@/context/CartContext";
import AnimatedSection from "@/components/AnimatedSection";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

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

  const jsonLd = useMemo(() => {
    const baseUrl = window.location.origin;
    return {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Catalogo Shenna Brows",
      description: SEO_DESCRIPTION,
      itemListElement: products.map((product, index) => ({
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
            price: Number(product.price).toFixed(2),
            availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            url: `${baseUrl}/${product.slug}`,
          },
        },
      })),
    };
  }, [products]);

  const handleAddToCart = (product: Product) => {
    addItem({
      id: product.id,
      name: product.name,
      slug: product.slug,
      category: product.category,
      price: Number(product.price),
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

      <section className="container mx-auto px-6">
        <AnimatedSection>
          <div className="rounded-3xl border border-gold/20 bg-[radial-gradient(circle_at_top_right,rgba(197,160,89,0.18),transparent_40%),linear-gradient(to_bottom,#fffaf0,#ffffff)] p-8 md:p-12 shadow-[0_14px_45px_rgba(0,0,0,0.06)]">
            <p className="text-gold text-xs uppercase tracking-[0.28em] font-medium mb-4">Tienda oficial</p>
            <h1 className="font-playfair text-4xl md:text-5xl lg:text-6xl text-carbon leading-tight">
              Herramientas premium para unas cejas impecables
            </h1>
            <p className="text-carbon/70 max-w-2xl mt-5 text-base md:text-lg leading-relaxed">
              Descubre la colección profesional de Shenna Brows. Productos diseñados para ofrecer precisión, control y resultados
              de alto nivel en cada aplicación.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 px-4 py-2 text-sm text-carbon/80 bg-white/80">
                <ShieldCheck size={16} className="text-gold" />
                Calidad profesional
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 px-4 py-2 text-sm text-carbon/80 bg-white/80">
                <Truck size={16} className="text-gold" />
                Envio rapido 24/72h
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 px-4 py-2 text-sm text-carbon/80 bg-white/80">
                <Sparkles size={16} className="text-gold" />
                Resultados de precision
              </span>
            </div>

            <Button
              asChild
              className="mt-8 rounded-full bg-gold hover:bg-gold/90 text-white px-8 py-6 text-sm tracking-[0.15em] uppercase shadow-[0_10px_30px_rgba(197,160,89,0.35)]"
            >
              <a href="#productos">Comprar ahora</a>
            </Button>
          </div>
        </AnimatedSection>
      </section>

      <section id="productos" className="container mx-auto px-6 mt-16">
        <AnimatedSection>
          <h2 className="font-playfair text-3xl md:text-4xl font-bold text-center text-carbon">Nuestra coleccion</h2>
          <p className="text-center text-carbon/60 max-w-2xl mx-auto mt-4 mb-10">
            Elige la herramienta ideal para elevar tu tecnica y potenciar el resultado de cada diseno.
          </p>
        </AnimatedSection>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gold/10">
                <Skeleton className="aspect-square" />
                <div className="p-6 space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-36" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-10 w-full mt-4" />
                </div>
              </div>
            ))
          ) : (
            products.map((product, i) => (
              <AnimatedSection key={product.id} delay={i * 0.06} className="h-full">
                <motion.article
                  whileHover={{ y: -8 }}
                  transition={{ duration: 0.3 }}
                  className="h-full bg-white rounded-2xl overflow-hidden border border-gold/10 shadow-[0_6px_24px_rgba(0,0,0,0.05)] hover:shadow-[0_14px_40px_rgba(0,0,0,0.1)] transition-shadow duration-500 flex flex-col cursor-pointer"
                  role="link"
                  tabIndex={0}
                  onClick={() => navigate(`/${product.slug}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(`/${product.slug}`);
                    }
                  }}
                >
                  <Link to={`/${product.slug}`} className="block aspect-square bg-muted overflow-hidden">
                    <img
                      src={getProductImageUrl(product.image_url, product.slug)}
                      alt={`${product.name} - Shenna Brows`}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                      loading="lazy"
                    />
                  </Link>

                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <p className="text-gold text-xs uppercase tracking-[0.2em] font-medium mb-2">{product.category}</p>
                      <h3 className="font-playfair text-xl font-semibold text-carbon mb-1">{product.name}</h3>
                      <p className="text-sm text-carbon/60">{product.tagline}</p>
                    </div>

                    <div className="mt-5">
                      <p className="text-lg font-semibold text-carbon mb-4">€{Number(product.price).toFixed(2)}</p>
                      <div className="flex">
                        <Button
                          className="w-full bg-gold hover:bg-gold/90 text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToCart(product);
                          }}
                          disabled={isAddToCartDisabled || product.stock <= 0}
                        >
                          <span className="relative mr-2 inline-flex">
                            <ShoppingCart size={16} />
                            <Plus size={11} className="absolute -top-1 -right-1" />
                          </span>
                          {isAddToCartDisabled ? "Próximamente" : "Añadir"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.article>
              </AnimatedSection>
            ))
          )}
        </div>
      </section>
    </main>
  );
};

export default Tienda;
