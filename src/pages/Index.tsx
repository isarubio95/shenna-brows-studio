import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import AnimatedSection from "@/components/AnimatedSection";
import TestimonialsCarousel from "@/components/TestimonialsCarousel";
import { motion } from "framer-motion";

import { Skeleton } from "@/components/ui/skeleton";
import logoGrande from "@/assets/logo-grande.png";
import heroBg from "@/assets/hero-bg-new.jpg";
import { getProductImageUrl } from "@/lib/product-images";
import CeoSection from "@/components/CeoSection";

const Index = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
        className="relative h-dvh max-h-dvh flex flex-col items-center justify-between px-6 bg-cover bg-center bg-no-repeat overflow-hidden"
        style={{ backgroundImage: `url(${heroBg})` }}
      >
        {/* Top spacer to push content down */}
        <div className="flex-1" />

        {/* Center content */}
        <div className="flex flex-col items-center relative z-10">
          <AnimatedSection>
            <h1 className="font-playfair text-carbon text-3xl md:text-5xl lg:text-6xl font-bold text-center leading-tight tracking-wide mb-3">
              LA PRECISIÓN
            </h1>
            <h1 className="font-playfair text-carbon text-3xl md:text-5xl lg:text-6xl font-bold text-center leading-tight tracking-wide">
              QUE TE DEFINE.
            </h1>
            <div className="w-20 h-[2px] bg-gold mx-auto mt-5 mb-8" />
          </AnimatedSection>

          <AnimatedSection delay={0.15}>
            <Link to="/pinzas">
              <Button className="bg-gradient-to-r from-gold to-[hsl(38,50%,65%)] hover:from-gold/90 hover:to-[hsl(38,50%,60%)] text-white px-10 py-6 text-sm md:text-base tracking-[0.25em] uppercase rounded-full shadow-[0_8px_30px_rgba(197,160,89,0.35)] hover:shadow-[0_12px_40px_rgba(197,160,89,0.5)] transition-all duration-300">
                Explorar colección →
              </Button>
            </Link>
          </AnimatedSection>
        </div>

        {/* Bottom section */}
        <div className="flex-1 flex flex-col items-center justify-end pb-8 relative z-10">
          <AnimatedSection delay={0.3}>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="text-gold/60 mb-4"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </motion.div>
            <p className="text-carbon/50 text-sm md:text-base tracking-wide font-medium">
              Conoce la historia de Shenna BROWS
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-24 bg-cream">
        <div className="container mx-auto px-6">
          <AnimatedSection>
            <h2 className="font-playfair text-3xl md:text-4xl font-bold text-carbon text-center mb-4">
              Nuestra colección
            </h2>
            <p className="text-carbon/50 text-center mb-16 max-w-lg mx-auto">
              Tres herramientas esenciales para la artista que busca perfección.
            </p>
          </AnimatedSection>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
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
                SHENNA <span className="italic text-gold">BROWS</span>
              </h2>

              <div className="space-y-4 text-carbon/60 text-[0.95rem] leading-relaxed text-center">
                <p>
                  Shenna BROWS es más que una marca. Es una manera de entender la belleza desde la precisión, el equilibrio y la excelencia.
                </p>
                <p>
                  Nace tras años de experiencia en el diseño profesional de cejas, del perfeccionismo constante y del compromiso innegociable con cada detalle del rostro. No surge de una tendencia. Surge de una convicción: <strong className="text-carbon/80">la belleza bien trabajada transforma la seguridad de una persona.</strong>
                </p>
                <p className="font-semibold text-carbon/80 italic">
                  Nuestra misión es clara y exigente: Elevar el estándar de la belleza a través de la precisión, la técnica y la coherencia estética.
                </p>
                <p>
                  Cada pieza responde a una misma filosofía: precisión absoluta. Todo lo que lleva el nombre de Shenna BROWS está concebido bajo criterios rigurosos de calidad europea, donde innovación, técnica, diseño refinado y funcionalidad conviven en equilibrio.
                </p>
                <p>
                  Nada es casual. Cada detalle está pensado para aportar armonía, seguridad y elegancia real.
                </p>
                <p>
                  Shenna BROWS representa profesionalismo, pero también accesibilidad consciente. Está creada para quienes entienden que la belleza no es exageración, sino equilibrio; no es exceso, sino intención.
                </p>
                <p>
                  Creemos en la armonía. En el detalle que marca la diferencia. En la elegancia que no necesita imponerse para destacar.
                </p>
                <p>
                  Aquí no vendemos productos. Creamos experiencia. Construimos confianza. Definimos un nuevo nivel de excelencia en el cuidado de la mirada.
                </p>
                <p className="font-playfair text-lg text-gold font-semibold pt-2">
                  Bienvenida a SHENNA BROWS.
                </p>
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
