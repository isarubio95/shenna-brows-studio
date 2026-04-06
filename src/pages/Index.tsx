import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
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

const VIDEO_POSTER_TIME = 2; // segundo del que extraer la portada

const Index = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [videoPoster, setVideoPoster] = useState<string | null>(null);

  useEffect(() => {
    (supabase as any).from("products").select("*").order("name").then(({ data }: any) => {
      setProducts(data || []);
      setLoading(false);
    });
  }, []);

  const scrollToNextSection = () => {
    document.getElementById("coleccion")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Extraer el frame del segundo 1 del vídeo para usarlo como portada
  useEffect(() => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.preload = "metadata";
    const onLoadedData = () => {
      video.currentTime = VIDEO_POSTER_TIME;
    };
    const onSeeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0);
          setVideoPoster(canvas.toDataURL("image/jpeg", 0.9));
        }
      } finally {
        video.remove();
      }
    };
    video.addEventListener("loadeddata", onLoadedData);
    video.addEventListener("seeked", onSeeked);
    video.src = "/video-presentacion.mp4";
    video.load();
    return () => {
      video.removeEventListener("loadeddata", onLoadedData);
      video.removeEventListener("seeked", onSeeked);
      video.remove();
    };
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
        <div className="relative z-10 w-full max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12">
            <div className="w-full lg:w-[58%] flex flex-col items-center">
              <AnimatedSection>
                <img 
                  src={logoMetalico} 
                  alt="Shenna Brows Logo" 
                  className="w-full sm:w-10/12 md:w-8/12 lg:w-full max-w-xl h-auto object-contain mb-4 drop-shadow-2xl" 
                />
                <h1 className="font-playfair text-carbon text-2xl md:text-3xl lg:text-4xl font-bold text-center tracking-[0.05em] mb-2 sm:mb-3">
                  LA PRECISIÓN
                </h1>
                <h1 className="font-playfair text-carbon text-2xl md:text-3xl lg:text-4xl font-bold text-center leading-tight tracking-[0.05em]">
                  QUE TE DEFINE
                </h1>
                <div className="w-16 sm:w-24 h-[2px] bg-gold mt-4 sm:mt-6 mb-6 sm:mb-8 mx-auto" />
              </AnimatedSection>

              <AnimatedSection delay={0.15}>
                <Link to="/tienda">
                  <div className="relative inline-flex rounded-full p-[2px] shadow-[0_8px_30px_rgba(197,160,89,0.35)] hover:shadow-[0_12px_40px_rgba(197,160,89,0.5)] transition-all duration-300 transform hover:-translate-y-1 active:scale-95 active:translate-y-0">
                    <div 
                      className="absolute inset-0 z-0 rounded-full overflow-hidden pointer-events-none"
                      style={{
                        padding: "2px",
                        WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                        WebkitMaskComposite: "xor",
                        maskComposite: "exclude"
                      }}
                    >
                      <span className="absolute inset-[-1000%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#92400e_0%,#fef08a_50%,#92400e_100%)]" />
                    </div>
                    <Button className="relative z-10 block bg-transparent bg-gradient-to-r from-gold/50 to-[hsla(38,61%,47%,0.5)] hover:from-gold/30 hover:to-[hsla(38,61%,47%,0.3)] backdrop-blur-md text-white px-8 sm:px-10 py-5 text-xs sm:text-sm md:text-base tracking-[0.25em] uppercase rounded-full transition-colors duration-300 w-full h-full shadow-inner font-playfair">
                      Explorar tienda →
                    </Button>
                  </div>
                </Link>
              </AnimatedSection>
            </div>

            <AnimatedSection delay={0.1} className="hidden lg:block w-full lg:w-[34%]">
              <div className="max-w-[320px] sm:max-w-[360px] mx-auto rounded-2xl overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.25)] border border-white/25 backdrop-blur-sm">
                <video
                  className="w-full aspect-[9/16] object-cover"
                  src="/video-presentacion.mp4"
                  poster={videoPoster ?? undefined}
                  autoPlay
                  muted
                  controls
                  playsInline
                  preload="metadata"
                >
                  Tu navegador no soporta la reproducción de video.
                </video>
              </div>
            </AnimatedSection>
          </div>
        </div>

        {/* Bottom section */}
        <div className="flex-1 flex flex-col items-center justify-end pb-12 relative z-10">
          <AnimatedSection delay={0.3}>
            <motion.button
              type="button"
              onClick={scrollToNextSection}
              aria-label="Bajar a la siguiente sección"
              animate={{ y: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="mb-3 sm:mb-4 text-white/90 hover:text-white transition-colors duration-300 flex items-center justify-center"
            >
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" className="mx-auto drop-shadow-[0_4px_8px_rgba(0,0,0,0.35)]">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </motion.button>
          </AnimatedSection>
        </div>
      </section>

      {/* Video móvil debajo del hero */}
      <section className="lg:hidden relative w-full h-[100dvh] overflow-hidden">
        <video
          className="w-full h-full object-cover"
          src="/video-presentacion.mp4"
          poster={videoPoster ?? undefined}
          autoPlay
          muted
          controls
          playsInline
          preload="metadata"
        >
          Tu navegador no soporta la reproducción de video.
        </video>
      </section>

      {/* Products Grid */}
      <section
        id="coleccion"
        className="py-20 md:py-24"
        style={{ backgroundColor: "#F8F3EB" }}
      >
        <div className="container mx-auto px-6">
          <AnimatedSection>
            <h2 className="font-playfair text-3xl md:text-4xl font-bold text-center mb-4" style={{ color: "var(--theme-color-h2, #1A1A1A)" }}>
              Nuestra colección
            </h2>
            <p className="text-center mb-12 md:mb-16 max-w-lg mx-auto" style={{ color: "var(--theme-color-paragraph, #1A1A1A)", opacity: 0.6 }}>
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
                <AnimatedSection key={product.id} delay={i * 0.1} className="h-full">
                  <Link to={`/${product.slug}`} className="block h-full">
                    <motion.div
                      whileHover={{ y: -8 }}
                      transition={{ duration: 0.3 }}
                      className="group h-full bg-white rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] transition-shadow duration-500 flex flex-col"
                    >
                      <div className="aspect-square bg-muted overflow-hidden">
                        <img
                          src={getProductImageUrl(product.image_url, product.slug)}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          loading="lazy"
                        />
                      </div>
                      <div className="p-6 flex-1 flex flex-col justify-between">
                        <div>
                          <p className="text-gold text-xs uppercase tracking-[0.2em] font-medium mb-2">{product.category}</p>
                          <h3 className="font-playfair text-xl font-semibold text-carbon mb-1">{product.name}</h3>
                          <p className="text-sm text-carbon/50">{product.tagline}</p>
                        </div>
                        <p className="text-lg font-semibold text-carbon mt-4">€{Number(product.price).toFixed(2)}</p>
                      </div>
                    </motion.div>
                  </Link>
                </AnimatedSection>
              ))
            )}
          </div>
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