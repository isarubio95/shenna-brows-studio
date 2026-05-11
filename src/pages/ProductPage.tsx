import { useParams, Link } from "react-router-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import AnimatedSection from "@/components/AnimatedSection";
import { ShoppingBag, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { getProductImageGallery, getProductImageUrl } from "@/lib/product-images";
import { motion } from "framer-motion";

type DescriptionItem = { content: string; format: "text" | "html" };

/** Convierte la descripción en ítems con el mismo criterio que materiales (una línea o un <p> por ítem). */
function parseProductDescription(description: string | null | undefined): DescriptionItem[] {
  const raw = (description || "").trim();
  if (!raw) return [];

  if (!raw.includes("<")) {
    return raw
      .split("\n")
      .filter((l) => l.trim())
      .map((line) => ({ content: line.trim(), format: "text" as const }));
  }

  const pBlocks = [...raw.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((m) => m[1].trim())
    .filter(Boolean);
  if (pBlocks.length > 0) {
    return pBlocks.map((content) => ({ content, format: "html" as const }));
  }

  return [{ content: raw, format: "html" }];
}

type CatalogProduct = {
  id: string;
  name: string;
  slug: string;
  category: string;
  price: number;
  image_url: string;
  tagline: string | null;
};

/** Coincide con `gap-3` (12px) del carrusel en móvil (antes del breakpoint `md`). */
const RELATED_CAROUSEL_GAP_PX = 12;

const ProductPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { addItem, isAddToCartDisabled } = useCart();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [otherProducts, setOtherProducts] = useState<CatalogProduct[]>([]);
  const relatedCarouselRef = useRef<HTMLDivElement>(null);
  const [relatedCarouselPage, setRelatedCarouselPage] = useState(0);

  const syncRelatedCarouselPage = useCallback(() => {
    const root = relatedCarouselRef.current;
    if (!root || otherProducts.length === 0) return;
    const first = root.children[0] as HTMLElement | undefined;
    if (!first) return;
    const step = Math.max(1, first.offsetWidth + RELATED_CAROUSEL_GAP_PX);
    const maxPage = otherProducts.length - 1;
    const maxScroll = root.scrollWidth - root.clientWidth;
    const { scrollLeft } = root;
    if (maxScroll <= 4) {
      setRelatedCarouselPage(0);
      return;
    }
    if (scrollLeft >= maxScroll - 4) {
      setRelatedCarouselPage(maxPage);
      return;
    }
    const raw = Math.round(scrollLeft / step);
    setRelatedCarouselPage(Math.max(0, Math.min(raw, maxPage)));
  }, [otherProducts.length]);

  useEffect(() => {
    if (!slug) return;
    (supabase as any)
      .from("products")
      .select("*")
      .eq("slug", slug)
      .maybeSingle()
      .then(({ data }: any) => {
        setProduct(data);
        setCurrentImageIndex(0);
        setLoading(false);
      });
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    (supabase as any)
      .from("products")
      .select("id,name,slug,category,price,image_url,tagline")
      .order("name")
      .then(({ data }: { data: CatalogProduct[] | null }) => {
        setOtherProducts((data || []).filter((p) => p.slug !== slug));
      });
  }, [slug]);

  useEffect(() => {
    const root = relatedCarouselRef.current;
    if (!root || otherProducts.length === 0) return;

    root.scrollLeft = 0;
    setRelatedCarouselPage(0);

    const sync = () => syncRelatedCarouselPage();
    sync();
    root.addEventListener("scroll", sync, { passive: true });
    root.addEventListener("scrollend", sync as EventListener, { passive: true });
    const ro = new ResizeObserver(sync);
    ro.observe(root);
    return () => {
      root.removeEventListener("scroll", sync);
      root.removeEventListener("scrollend", sync as EventListener);
      ro.disconnect();
    };
  }, [slug, otherProducts, syncRelatedCarouselPage]);

  const scrollRelatedCarouselToPage = useCallback((page: number) => {
    const root = relatedCarouselRef.current;
    const first = root?.children[0] as HTMLElement | undefined;
    if (!root || !first) return;
    const step = first.offsetWidth + RELATED_CAROUSEL_GAP_PX;
    root.scrollTo({ left: page * step, behavior: "smooth" });
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-cream pt-24">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </main>
    );
  }

  if (!product) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-cream pt-24">
        <div className="text-center">
          <h1 className="font-playfair text-3xl text-carbon mb-4">Producto no encontrado</h1>
          <Link to="/" className="text-gold hover:underline">Volver al inicio</Link>
        </div>
      </main>
    );
  }

  const handleAdd = () => {
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

  const descriptionItems = parseProductDescription(product.description);
  const gallery = getProductImageGallery(product.image_url, product.slug);

  return (
    <main className="min-h-screen bg-cream pt-32 pb-16">
      <div className="container mx-auto px-6">



        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          <AnimatedSection>
            <div>
              <div className="relative aspect-square rounded-2xl bg-white overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
                <img src={gallery[currentImageIndex]} alt={product.name} className="w-full h-full object-cover" />
                {gallery.length > 1 && (
                  <>
                    <button
                      type="button"
                      aria-label="Foto anterior"
                      onClick={() => setCurrentImageIndex((prev) => (prev === 0 ? gallery.length - 1 : prev - 1))}
                      className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/95 hover:bg-white text-carbon rounded-full p-2 shadow"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      type="button"
                      aria-label="Siguiente foto"
                      onClick={() => setCurrentImageIndex((prev) => (prev === gallery.length - 1 ? 0 : prev + 1))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/95 hover:bg-white text-carbon rounded-full p-2 shadow"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </>
                )}
              </div>
              {gallery.length > 1 && (
                <div className="mt-4 grid grid-cols-5 gap-2">
                  {gallery.map((imageUrl, index) => (
                    <button
                      key={`${product.id}-thumb-${index}`}
                      type="button"
                      aria-label={`Ver imagen ${index + 1}`}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`aspect-square rounded-lg overflow-hidden border transition ${
                        index === currentImageIndex ? "border-gold ring-2 ring-gold/30" : "border-gold/15 hover:border-gold/40"
                      }`}
                    >
                      <img src={imageUrl} alt={`${product.name} miniatura ${index + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.15}>
            <div className="flex flex-col justify-center">
              <p className="text-gold text-xs uppercase tracking-[0.3em] font-medium mb-3">{product.category}</p>
              <h1 className="font-playfair text-4xl md:text-5xl font-bold text-carbon mb-3">{product.name}</h1>
              <p className="text-carbon/50 text-lg italic mb-6">{product.tagline}</p>
              <p className="font-playfair text-3xl font-bold text-carbon mb-8">€{Number(product.price).toFixed(2)}</p>

              <Button
                onClick={handleAdd}
                disabled={isAddToCartDisabled || product.stock <= 0}
                className="bg-gold hover:bg-gold/90 text-white px-8 py-6 text-base tracking-wide rounded-full shadow-[0_8px_30px_rgba(197,160,89,0.3)] hover:shadow-[0_12px_40px_rgba(197,160,89,0.4)] transition-all duration-300 w-full sm:w-auto mb-10"
              >
                <ShoppingBag size={18} className="mr-2" />
                {isAddToCartDisabled ? "Próximamente" : "Añadir al Carrito"}
              </Button>

              <div className="border-t border-gold/10 space-y-0">
                <section className="border-b border-gold/10 py-5">
                  <h3 className="text-carbon text-sm font-medium tracking-wide mb-3">Descripción</h3>
                  {descriptionItems.length > 0 ? (
                    <ul className="space-y-2">
                      {descriptionItems.map((item, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2.5 text-carbon/60 text-sm leading-relaxed [&_a]:text-gold [&_a]:underline"
                        >
                          <span className="text-gold/70 mt-0.5 shrink-0">✦</span>
                          {item.format === "html" ? (
                            <span dangerouslySetInnerHTML={{ __html: item.content }} />
                          ) : (
                            <span>{item.content}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>
                <section className="border-b border-gold/10 py-5">
                  <h3 className="text-carbon text-sm font-medium tracking-wide mb-3">
                    {product.materials_label === 'composicion' ? 'Composición' : 'Materiales'}
                  </h3>
                  {product.materials ? (
                    <ul className="space-y-2">
                      {product.materials.split('\n').filter((m: string) => m.trim()).map((item: string, i: number) => (
                        <li key={i} className="flex items-start gap-2.5 text-carbon/60 text-sm leading-relaxed">
                          <span className="text-gold/70 mt-0.5 shrink-0">✦</span>
                          <span>{item.trim()}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-carbon/40 text-sm italic">Sin información</p>
                  )}
                </section>
                <section className="border-b border-gold/10 py-5">
                  <h3 className="text-carbon text-sm font-medium tracking-wide mb-3">Envío</h3>
                  <p className="text-carbon/60 text-sm leading-relaxed">{product.shipping_info}</p>
                </section>
              </div>
            </div>
          </AnimatedSection>
        </div>

        {otherProducts.length > 0 && (
          <AnimatedSection delay={0.08} className="mt-16 md:mt-24 pt-12 md:pt-16 border-t border-gold/10">
            <div className="max-w-2xl mx-auto text-center mb-8 md:mb-10">
              <p className="text-gold/90 text-[10px] sm:text-xs uppercase tracking-[0.28em] font-medium mb-2">
                Colección
              </p>
              <h2 className="font-playfair text-xl sm:text-2xl md:text-3xl text-carbon/85 font-semibold tracking-tight">
                Completa tu carrito con estos productos
              </h2>
              <p className="text-carbon/45 text-sm mt-3 leading-relaxed">
                El resto de la línea, en un vistazo discreto por si quieres añadir algo más antes de pagar.
              </p>
            </div>

            <div className="max-md:-mx-6 max-md:px-6">
              <div
                ref={relatedCarouselRef}
                className="flex flex-row md:grid md:grid-cols-2 lg:grid-cols-4 md:max-w-5xl md:mx-auto gap-3 md:gap-4 overflow-x-auto md:overflow-x-visible overscroll-x-contain touch-pan-x snap-x snap-mandatory md:snap-none pb-1 md:pb-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              >
                {otherProducts.map((p) => (
                  <Link
                    key={p.id}
                    to={`/${p.slug}`}
                    className="snap-start shrink-0 w-[78vw] max-w-76 min-w-0 md:w-full md:max-w-none md:shrink"
                  >
                    <motion.div
                      whileHover={{ y: -3 }}
                      transition={{ duration: 0.25 }}
                      className="h-full rounded-xl border border-gold/10 bg-white/70 backdrop-blur-[2px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:border-gold/25 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-shadow duration-300 overflow-hidden flex flex-col"
                    >
                      <div className="aspect-4/3 bg-muted/80 overflow-hidden">
                        <img
                          src={getProductImageUrl(p.image_url, p.slug)}
                          alt={p.name}
                          className="w-full h-full object-cover opacity-[0.92] hover:opacity-100 scale-[1.02] hover:scale-105 transition-[opacity,transform] duration-500"
                          loading="lazy"
                        />
                      </div>
                      <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between gap-1">
                        <div>
                          <p className="text-gold/80 text-[9px] sm:text-[10px] uppercase tracking-[0.2em] font-medium mb-1 line-clamp-1">
                            {p.category}
                          </p>
                          <h3 className="font-playfair text-sm sm:text-base text-carbon/90 font-medium leading-snug line-clamp-2">
                            {p.name}
                          </h3>
                        </div>
                        <p className="text-carbon/55 text-xs font-medium pt-1">€{Number(p.price).toFixed(2)}</p>
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </div>

              {otherProducts.length > 1 && (
                <div
                  className="flex md:hidden justify-center items-center gap-2 mt-5"
                  role="tablist"
                  aria-label="Posición en el carrusel de productos"
                >
                  {otherProducts.map((p, i) => (
                    <button
                      key={p.id}
                      type="button"
                      role="tab"
                      aria-selected={i === relatedCarouselPage}
                      aria-label={`Ver ${p.name}`}
                      onClick={() => scrollRelatedCarouselToPage(i)}
                      className={`rounded-full transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F8F3EB] ${
                        i === relatedCarouselPage
                          ? "h-2 w-6 bg-gold"
                          : "h-2 w-2 bg-carbon/20 hover:bg-carbon/35"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </AnimatedSection>
        )}
      </div>
    </main>
  );
};

export default ProductPage;
