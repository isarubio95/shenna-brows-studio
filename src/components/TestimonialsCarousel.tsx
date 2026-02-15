import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AnimatedSection from "@/components/AnimatedSection";
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
      const { data: tData, error } = await (supabase as any)
        .from("testimonials")
        .select("*")
        .eq("is_featured", true)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      if (!tData || tData.length === 0) return [];
      const userIds = tData.map((t: any) => t.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);
      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p.full_name]));
      return tData.map((t: any) => ({ ...t, author_name: profileMap.get(t.user_id) || "Cliente Shenna" }));
    },
  });

  if (testimonials.length === 0) return null;

  return (
    <section className="py-24 bg-[hsl(0,0%,10%)]">
      <div className="container mx-auto px-6 max-w-4xl">
        <AnimatedSection>
          <p className="text-center text-primary text-xs uppercase tracking-[0.3em] font-medium mb-4">
            Testimonios
          </p>
          <h2 className="font-playfair text-3xl md:text-4xl font-bold text-white text-center mb-16">
            Love from our <span className="italic text-primary">Clients</span>
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
                        className="text-primary/40 mb-8 rotate-180"
                        strokeWidth={1}
                      />
                      <blockquote className="font-playfair text-xl md:text-2xl lg:text-3xl italic text-white/90 leading-relaxed mb-8 max-w-2xl">
                        "{t.content}"
                      </blockquote>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-px bg-primary/60" />
                        <span className="text-primary text-sm tracking-[0.15em] uppercase font-medium">
                          {name}
                        </span>
                        <div className="w-8 h-px bg-primary/60" />
                      </div>
                    </div>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex -left-4 border-primary/20 text-primary hover:bg-primary/10 hover:text-primary bg-transparent" />
            <CarouselNext className="hidden md:flex -right-4 border-primary/20 text-primary hover:bg-primary/10 hover:text-primary bg-transparent" />
          </Carousel>
        </AnimatedSection>
      </div>
    </section>
  );
};

export default TestimonialsCarousel;
