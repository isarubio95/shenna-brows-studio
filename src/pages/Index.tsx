import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import AnimatedSection from "@/components/AnimatedSection";
import TestimonialsCarousel from "@/components/TestimonialsCarousel";

import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import logoGrande from "@/assets/logo-grande.png";
import heroBg from "@/assets/hero-bg.jpg";
import { getProductImageUrl } from "@/lib/product-images";
import alexandraImg from "@/assets/alexandra.png";

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
        className="relative h-dvh max-h-dvh flex flex-col items-center justify-center px-6 bg-cover bg-center bg-no-repeat brightness-105 overflow-hidden"
        style={{ backgroundImage: `url(${heroBg})` }}
      >
        <div className="absolute inset-0 bg-white opacity-15"></div>
        <AnimatedSection>
          <img 
            src={logoGrande} 
            alt="Shenna Brows" 
            className="w-full md:w-[26rem] lg:w-[32rem] mx-auto mb-6 relative z-10 
                      [filter:drop-shadow(4px_4px_4px_rgba(0,0,0,.2))]" 
          />
        </AnimatedSection>
        <AnimatedSection delay={0.1}>
          <h1 className="text-carbon/60 text-xl md:text-2xl font-semibold max-w-xl text-center mb-5 leading-relaxed relative z-10">
            BIENVENIDA AL UNIVERSO SHENNA
          </h1>
          <p className="text-carbon/60 text-lg md:text-xl max-w-xl text-center mb-5 leading-relaxed relative z-10">
            Herramientas y productos para cejas diseñados por la artista de cejas profesional Shenna.
          </p>
        </AnimatedSection>
        <AnimatedSection delay={0.2}>
          <div className="relative z-10">
          <Link to="/pinzas">
            <Button className="bg-gold hover:bg-gold/90 text-white px-10 py-6 text-base tracking-wide rounded-full shadow-[0_8px_30px_rgba(197,160,89,0.3)] hover:shadow-[0_12px_40px_rgba(197,160,89,0.4)] transition-all duration-300">
              Descubrir colección
            </Button>
          </Link>
          </div>
        </AnimatedSection>
      </section>

      {/* Brand Story */}
      <section className="py-24 md:py-32 bg-white">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <AnimatedSection>
              <div className="relative">
                <img
                  src={alexandraImg}
                  alt="Shenna - Artista profesional de cejas"
                  className="w-full max-w-md mx-auto lg:mx-0 object-contain"
                />
              </div>
            </AnimatedSection>

            <AnimatedSection delay={0.15}>
              <div className="space-y-6">
                <h2 className="font-playfair text-3xl md:text-4xl font-bold text-carbon">
                  SHENNA <span className="italic text-gold">BROWS</span>
                </h2>

                <div className="space-y-4 text-carbon/60 text-[0.95rem] leading-relaxed">
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

      {/* Testimonials */}
      <TestimonialsCarousel />
    </main>
  );
};

export default Index;
