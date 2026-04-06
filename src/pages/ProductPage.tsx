import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import AnimatedSection from "@/components/AnimatedSection";
import { ShoppingBag, Loader2 } from "lucide-react";
import { getProductImageUrl } from "@/lib/product-images";

const ProductPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { addItem } = useCart();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    (supabase as any)
      .from("products")
      .select("*")
      .eq("slug", slug)
      .maybeSingle()
      .then(({ data }: any) => {
        setProduct(data);
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

  const descriptionHtml = (product.description || "").includes("<")
    ? product.description
    : (product.description || "").replace(/\n/g, "<br />");

  return (
    <main className="min-h-screen bg-cream pt-32 pb-16">
      <div className="container mx-auto px-6">



        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          <AnimatedSection>
            <div className="aspect-square rounded-2xl bg-white overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
              <img src={getProductImageUrl(product.image_url, product.slug)} alt={product.name} className="w-full h-full object-cover" />
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
                className="bg-gold hover:bg-gold/90 text-white px-8 py-6 text-base tracking-wide rounded-full shadow-[0_8px_30px_rgba(197,160,89,0.3)] hover:shadow-[0_12px_40px_rgba(197,160,89,0.4)] transition-all duration-300 w-full sm:w-auto mb-10"
              >
                <ShoppingBag size={18} className="mr-2" />
                Añadir al Carrito
              </Button>

              <div className="border-t border-gold/10 space-y-0">
                <section className="border-b border-gold/10 py-5">
                  <h3 className="text-carbon text-sm font-medium tracking-wide mb-3">Descripción</h3>
                  <div
                    className="text-carbon/60 text-sm leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5 [&_a]:text-gold [&_a]:underline"
                    dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                  />
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
