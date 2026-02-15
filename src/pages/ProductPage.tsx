import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import AnimatedSection from "@/components/AnimatedSection";
import { ShoppingBag, ArrowLeft, Loader2 } from "lucide-react";
import productPinzas from "@/assets/product-pinzas.jpg";
import productTijeras from "@/assets/product-tijeras.jpg";
import productGel from "@/assets/product-gel.jpg";

const productImages: Record<string, string> = {
  pinzas: productPinzas,
  tijeras: productTijeras,
  gel: productGel,
};

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

  return (
    <main className="min-h-screen bg-cream pt-24 pb-16">
      <div className="container mx-auto px-6">
        <AnimatedSection>
          <Link to="/" className="inline-flex items-center gap-2 text-carbon/50 hover:text-gold transition-colors text-sm mb-8">
            <ArrowLeft size={16} />
            Volver a la colección
          </Link>
        </AnimatedSection>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          <AnimatedSection>
            <div className="aspect-square rounded-2xl bg-white overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
              <img src={productImages[product.slug] || product.image_url} alt={product.name} className="w-full h-full object-cover" />
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

              <Accordion type="single" collapsible className="border-t border-gold/10">
                <AccordionItem value="description" className="border-b border-gold/10">
                  <AccordionTrigger className="text-carbon hover:text-gold hover:no-underline py-5 text-sm font-medium tracking-wide">Descripción</AccordionTrigger>
                  <AccordionContent className="text-carbon/60 text-sm leading-relaxed pb-5">{product.description}</AccordionContent>
                </AccordionItem>
                <AccordionItem value="materials" className="border-b border-gold/10">
                  <AccordionTrigger className="text-carbon hover:text-gold hover:no-underline py-5 text-sm font-medium tracking-wide">Materiales</AccordionTrigger>
                  <AccordionContent className="text-carbon/60 text-sm leading-relaxed pb-5">{product.materials}</AccordionContent>
                </AccordionItem>
                <AccordionItem value="shipping" className="border-b border-gold/10">
                  <AccordionTrigger className="text-carbon hover:text-gold hover:no-underline py-5 text-sm font-medium tracking-wide">Envío</AccordionTrigger>
                  <AccordionContent className="text-carbon/60 text-sm leading-relaxed pb-5">{product.shipping_info}</AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </main>
  );
};

export default ProductPage;
