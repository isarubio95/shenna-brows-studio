import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { useSiteContent } from "@/hooks/use-site-content";
import { Button } from "@/components/ui/button";
import AnimatedSection from "@/components/AnimatedSection";
import TestimonialsCarousel from "@/components/TestimonialsCarousel";
import { motion } from "framer-motion";

import { Skeleton } from "@/components/ui/skeleton";
// Nueva imagen de fondo importada
import fondoBg from "@/assets/fondo.png"; 
import logoMetalico from "@/assets/logo-metalico.png";
import { getProductImageUrl } from "@/lib/product-images";
import CeoSection from "@/components/CeoSection";

const Index = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: siteContent } = useSiteContent(["index_brand_story"]);

  useEffect(() => {
    (supabase as any).from("products").select("*").order("name").then(({ data }: any) => {
      setProducts(data || []);
      setLoading(false);
    });
  }, []);

  return (
    <main>
      {/* Hero */}
      <section
        className="relative w-full min-h-[100dvh] flex flex-col items-center justify-between px-4 sm:px-6 bg-cover bg-center bg-no-repeat overflow-hidden"
        style={{ backgroundImage: `url(${fondoBg})` }}
      >
        {/* Overlay de degradado para aclarar la parte superior y dar profundidad abajo */}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.7)_0%,rgba(0,0,0,0.3)_10%,transparent_20%,transparent_70%,rgba(26,26,26,0.4)_100%)] z-0 pointer-events-none" />

        {/* Top spacer to push content down */}
        <div className="flex-1" />

        {/* Center content */}
        <div className="flex flex-col items-center relative z-10 w-full max-w-4xl mx-auto">
          <AnimatedSection>
            <img 
              src={logoMetalico} 
              alt="Shenna Brows Logo" 
              className="w-full sm:w-10/12 md:w-8/12 lg:w-7/12 h-auto object-contain mb-4 drop-shadow-2xl m-auto" 
            />
            <h1 className="font-playfair text-carbon text-2xl md:text-3xl lg:text-4xl font-bold text-center tracking-[0.05em] mb-2 sm:mb-3">
              LA PRECISIÓN
            </h1>
            <h1 className="font-playfair text-carbon text-2xl md:text-3xl lg:text-4xl font-bold text-center leading-tight tracking-[0.05em]">
              QUE TE DEFINE
            </h1>
            <div className="w-16 sm:w-24 h-[2px] bg-gold mx-auto mt-4 sm:mt-6 mb-6 sm:mb-8" />
          </AnimatedSection>

          <AnimatedSection delay={0.15}>
            <Link to="/pinzas">
              <div className="relative inline-flex rounded-full p-[2px] shadow-[0_8px_30px_rgba(197,160,89,0.35)] hover:shadow-[0_12px_40px_rgba(197,160,89,0.5)] transition-all duration-300 transform hover:-translate-y-1 active:scale-95 active:translate-y-0">
                
                {/* Contenedor exclusivo para el borde animado */}
                  <div 
                    className="absolute inset-0 z-0 rounded-full overflow-hidden pointer-events-none"
                    style={{
                      padding: "2px", // Debe coincidir con el padding del div principal
                      WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                      WebkitMaskComposite: "xor",
                      maskComposite: "exclude"
                    }}
                  >
                    <span className="absolute inset-[-1000%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#92400e_0%,#fef08a_50%,#92400e_100%)]" />
                  </div>
                  
                  {/* Botón interior: Añadido bg-transparent para anular colores por defecto */}
                  <Button className="relative z-10 block bg-transparent bg-gradient-to-r from-gold/50 to-[hsla(38,61%,47%,0.5)] hover:from-gold/30 hover:to-[hsla(38,61%,47%,0.3)] backdrop-blur-md text-white px-8 sm:px-10 py-5 text-xs sm:text-sm md:text-base tracking-[0.25em] uppercase rounded-full transition-colors duration-300 w-full h-full shadow-inner">
                    Explorar colección →
                  </Button>

                </div>
            </Link>
          </AnimatedSection>
        </div>

        {/* Bottom section */}
        <div className="flex-1 flex flex-col items-center justify-end pb-12 relative z-10">
          <AnimatedSection delay={0.3}>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="text-gold/60 mb-3 sm:mb-4"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </motion.div>
            <p className="text-carbon/50 text-xs sm:text-sm md:text-base tracking-wide font-medium text-center">
              Conoce la historia de Shenna BROWS
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-20 md:py-24 bg-cream">
        <div className="container mx-auto px-6">
          <AnimatedSection>
            <h2 className="font-playfair text-3xl md:text-4xl font-bold text-carbon text-center mb-4">
              Nuestra colección
            </h2>
            <p className="text-carbon/50 text-center mb-12 md:mb-16 max-w-lg mx-auto">
              Cinco herramientas esenciales para la artista que busca perfección.
            </p>
          </AnimatedSection>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl overflow-hidden">
                  <Skeleton className="aspect-square" />
                  <div className="p-6 space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
              ))
            ) : (
              products.map((product, i) => (
                <AnimatedSection key={product.id} delay={i * 0.1}>
                  <Link to={`/${product.slug}`}>
                    <motion.div
                      whileHover={{ y: -8 }}
                      transition={{ duration: 0.3 }}
                      className="group bg-white rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] transition-shadow duration-500"
                    >
                      <div className="aspect-square bg-muted overflow-hidden">
                        <img
                          src={getProductImageUrl(product.image_url, product.slug)}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          loading="lazy"
                        />
                      </div>
                      <div className="p-6">
                        <p className="text-gold text-xs uppercase tracking-[0.2em] font-medium mb-2">{product.category}</p>
                        <h3 className="font-playfair text-xl font-semibold text-carbon mb-1">{product.name}</h3>
                        <p className="text-sm text-carbon/50 mb-3">{product.tagline}</p>
                        <p className="text-lg font-semibold text-carbon">€{Number(product.price).toFixed(2)}</p>
                      </div>
                    </motion.div>
                  </Link>
                </AnimatedSection>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Brand Story */}
      <section className="py-24 md:py-32 bg-white">
        <div className="container mx-auto px-6 max-w-3xl">
          <AnimatedSection>
            <div className="space-y-6">
              <h2 className="font-playfair text-3xl md:text-4xl font-bold text-carbon text-center">
                {siteContent["index_brand_story"]?.title ? (
                  <>
                    {siteContent["index_brand_story"].title.split(" ").slice(0, -1).join(" ")}{" "}
                    <span className="italic text-gold">
                      {siteContent["index_brand_story"].title.split(" ").slice(-1)[0]}
                    </span>
                  </>
                ) : (
                  <>SHENNA <span className="italic text-gold">BROWS</span></>
                )}
              </h2>

              <div className="space-y-4 text-carbon/60 text-[0.95rem] leading-relaxed text-center">
                {(siteContent["index_brand_story"]?.content || "").split("\n\n").filter(Boolean).map((paragraph, i, arr) => {
                  const isLast = i === arr.length - 1;
                  if (isLast) {
                    return (
                      <p key={i} className="font-playfair text-lg text-gold font-semibold pt-2">
                        {paragraph}
                      </p>
                    );
                  }
                  return <p key={i}>{paragraph}</p>;
                })}
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* CEO */}
      <CeoSection />

      {/* Testimonials */}
      <TestimonialsCarousel />
    </main>
  );
};

export default Index;