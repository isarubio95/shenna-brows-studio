import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import AnimatedSection from "@/components/AnimatedSection";
import TestimonialsCarousel from "@/components/TestimonialsCarousel";
import { Scissors, Target, Gem } from "lucide-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

const benefits = [
  { icon: Gem, title: "Acero inoxidable italiano", desc: "Materiales premium seleccionados por su durabilidad y precisión." },
  { icon: Target, title: "Precisión absoluta", desc: "Cada herramienta calibrada a mano para un rendimiento perfecto." },
  { icon: Scissors, title: "Diseñado por experiencia", desc: "Nacido de años de trabajo profesional con cejas reales." },
];

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
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-cream via-cream to-gold/5">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-gold/5 via-transparent to-transparent" />
        <div className="container mx-auto px-6 py-32 text-center relative z-10">
          <AnimatedSection>
            <p className="text-gold text-sm uppercase tracking-[0.3em] font-medium mb-6">
              Herramientas profesionales de cejas
            </p>
          </AnimatedSection>
          <AnimatedSection delay={0.1}>
            <h1 className="font-playfair text-5xl md:text-7xl lg:text-8xl font-bold text-carbon leading-[1.1] mb-6">
              La precisión<br />
              <span className="italic text-gold">que te define</span>
            </h1>
          </AnimatedSection>
          <AnimatedSection delay={0.2}>
            <p className="text-carbon/60 text-lg md:text-xl max-w-xl mx-auto mb-10 leading-relaxed">
              Herramientas creadas desde la experiencia profesional. Acero italiano, diseño con alma.
            </p>
          </AnimatedSection>
          <AnimatedSection delay={0.3}>
            <Link to="/pinzas">
              <Button className="bg-gold hover:bg-gold/90 text-white px-10 py-6 text-base tracking-wide rounded-full shadow-[0_8px_30px_rgba(197,160,89,0.3)] hover:shadow-[0_12px_40px_rgba(197,160,89,0.4)] transition-all duration-300">
                Descubrir colección
              </Button>
            </Link>
          </AnimatedSection>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <AnimatedSection>
            <h2 className="font-playfair text-3xl md:text-4xl font-bold text-carbon text-center mb-16">
              ¿Por qué <span className="italic text-gold">Shenna</span>?
            </h2>
          </AnimatedSection>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {benefits.map((b, i) => (
              <AnimatedSection key={b.title} delay={i * 0.1}>
                <div className="text-center group">
                  <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gold/10 flex items-center justify-center group-hover:bg-gold/20 transition-colors duration-300">
                    <b.icon size={28} className="text-gold" strokeWidth={1.5} />
                  </div>
                  <h3 className="font-playfair text-xl font-semibold text-carbon mb-3">{b.title}</h3>
                  <p className="text-carbon/50 text-sm leading-relaxed max-w-xs mx-auto">{b.desc}</p>
                </div>
              </AnimatedSection>
            ))}
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
                          src={product.image_url}
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
