import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AnimatedSection from "@/components/AnimatedSection";
import paperTexture from "@/assets/paper-texture.avif";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Quote } from "lucide-react";
import Autoplay from "embla-carousel-autoplay";
import { useEffect, useMemo, useRef, useState } from "react";

const PAGE_SIZE = 8;

type FeaturedTestimonial = {
  author_name: string;
  content: string | null;
  created_at: string | null;
};

type TestimonialsPage = {
  items: FeaturedTestimonial[];
  total: number | null;
};

const TestimonialsCarousel = () => {
  const autoplayPlugin = useMemo(
    () => Autoplay({ delay: 5000, stopOnInteraction: false }),
    [],
  );
  const [api, setApi] = useState<CarouselApi>();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = useInfiniteQuery({
    queryKey: ["featured-testimonials"],
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<TestimonialsPage> => {
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data: rows, error, count } = await supabase
        .from("profiles_public_view")
        .select("full_name, content, created_at", { count: "exact" })
        .eq("is_featured", true)
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      return {
        items: (rows ?? []).map((row) => ({
          author_name: row.full_name || "Cliente Shenna",
          content: row.content,
          created_at: row.created_at,
        })),
        total: count,
      };
    },
    getNextPageParam: (lastPage, _pages, lastPageParam) => {
      if (lastPage.items.length < PAGE_SIZE) return undefined;
      const loaded = (lastPageParam + 1) * PAGE_SIZE;
      if (typeof lastPage.total === "number" && loaded >= lastPage.total) return undefined;
      return lastPageParam + 1;
    },
  });

  const testimonials = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data],
  );

  const canLoop = testimonials.length > 1;
  const carouselOpts = useMemo(
    () => ({
      loop: canLoop,
      align: "center" as const,
    }),
    [canLoop],
  );

  useEffect(() => {
    if (!api) return;

    const onSelect = () => {
      setSelectedIndex(api.selectedScrollSnap());
    };

    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);

    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api]);

  const loadedCount = useRef(0);
  useEffect(() => {
    if (!api) return;
    if (loadedCount.current === testimonials.length) return;
    const isInitialLoad = loadedCount.current === 0;
    loadedCount.current = testimonials.length;
    if (isInitialLoad) return;
    api.reInit();
  }, [api, testimonials.length]);

  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage || isFetchNextPageError || testimonials.length === 0) {
      return;
    }
    if (selectedIndex + PAGE_SIZE >= testimonials.length) {
      void fetchNextPage();
    }
  }, [
    fetchNextPage,
    hasNextPage,
    isFetchNextPageError,
    isFetchingNextPage,
    selectedIndex,
    testimonials.length,
  ]);

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
          <h2 className="font-playfair text-3xl md:text-4xl font-bold text-center mb-16" style={{ color: "var(--theme-color-h2, #1A1A1A)" }}>
            Lo que dicen nuestras <span className="italic text-gold">clientas</span>
          </h2>
        </AnimatedSection>

        <AnimatedSection delay={0.1}>
          <Carousel
            setApi={setApi}
            plugins={[autoplayPlugin]}
            opts={carouselOpts}
            className="w-full"
          >
            <CarouselContent>
              {testimonials.map((t, index) => {
                const testimonialKey = `${t.created_at ?? "sin-fecha"}-${index}`;
                return (
                  <CarouselItem key={testimonialKey}>
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
                          {t.author_name}
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
