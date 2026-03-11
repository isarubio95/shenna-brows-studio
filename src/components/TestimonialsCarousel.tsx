import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AnimatedSection from "@/components/AnimatedSection";
import paperTexture from "@/assets/paper-texture.avif";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Quote } from "lucide-react";
import Autoplay from "embla-carousel-autoplay";
import { useRef } from "react";

const TestimonialsCarousel = () => {
  const plugin = useRef(Autoplay({ delay: 5000, stopOnInteraction: false }));

  const { data: testimonials = [] } = useQuery({
    queryKey: ["featured-testimonials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles_public_view")
        .select("*")
        .eq("is_featured", true)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data || []).map((t) => ({ ...t, author_name: t.full_name || "Cliente Shenna" }));
    },
  });

  if (testimonials.length === 0) return null;

  return (
    <section className="py-24 relative overflow-hidden" style={{ backgroundColor: "var(--theme-section-testimonials-bg, #F9F7F2)" }}>
      {/* Paper texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url(${paperTexture})`,
          backgroundRepeat: "repeat",
          backgroundSize: "cover",
          mixBlendMode: "multiply",
          opacity: 0.15,
        }}
      />
      <div className="container mx-auto px-6 max-w-4xl relative z-10">
        <AnimatedSection>
          <p className="text-center text-gold text-xs uppercase tracking-[0.3em] font-medium mb-4">
            Testimonios
          </p>
          <h2 className="font-playfair text-3xl md:text-4xl font-bold text-carbon text-center mb-16">
            Lo que dicen nuestras <span className="italic text-gold">clientas</span>
          </h2>
        </AnimatedSection>

        <AnimatedSection delay={0.1}>
          <Carousel
            plugins={[plugin.current]}
            opts={{ loop: true, align: "center" }}
            className="w-full"
          >
            <CarouselContent>
              {testimonials.map((t: any) => {
                const name = t.author_name;
                return (
                  <CarouselItem key={t.id}>
                    <div className="flex flex-col items-center text-center px-4 md:px-12 py-8">
                      <Quote
                        size={36}
                        className="text-gold/40 mb-8 rotate-180"
                        strokeWidth={1}
                      />
                      <blockquote className="font-playfair text-xl md:text-2xl lg:text-3xl italic text-carbon/90 leading-relaxed mb-8 max-w-2xl">
                        "{t.content}"
                      </blockquote>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-px bg-gold/60" />
                        <span className="text-gold text-sm tracking-[0.15em] uppercase font-medium">
                          {name}
                        </span>
                        <div className="w-8 h-px bg-gold/60" />
                      </div>
                    </div>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex -left-4 border-gold/20 text-gold hover:bg-gold/10 hover:text-gold bg-transparent" />
            <CarouselNext className="hidden md:flex -right-4 border-gold/20 text-gold hover:bg-gold/10 hover:text-gold bg-transparent" />
          </Carousel>
        </AnimatedSection>
      </div>
    </section>
  );
};

export default TestimonialsCarousel;
