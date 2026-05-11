import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import AnimatedSection from "@/components/AnimatedSection";
import { ShoppingBag, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { getProductImageGallery } from "@/lib/product-images";

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

const ProductPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { addItem, isAddToCartDisabled } = useCart();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

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
      </div>
    </main>
  );
};

export default ProductPage;
