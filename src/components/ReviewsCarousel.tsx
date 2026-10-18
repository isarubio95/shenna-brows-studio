import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Autoplay from "embla-carousel-autoplay";
import { ArrowRight, Quote } from "lucide-react";
import AnimatedSection from "@/components/AnimatedSection";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { fetchFeaturedTestimonials, TESTIMONIALS_PAGE_PATH } from "@/lib/testimonials";
import { cn } from "@/lib/utils";

/**
 * Reseñas destacadas en carrusel, en todas las páginas de la tienda. Son las
 * mismas que lista /testimonios (las que el panel marca como destacadas).
 */
const ReviewsCarousel = ({ className }: { className?: string }) => {
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(0);
  const [snapCount, setSnapCount] = useState(0);
  const autoplay = useMemo(() => Autoplay({ delay: 5500, stopOnInteraction: true }), []);

  const { data } = useQuery({
    // Clave propia: /testimonios usa la misma consulta en modo infinito.
    queryKey: ["featured-testimonials-carousel"],
    queryFn: () => fetchFeaturedTestimonials(0),
    staleTime: 5 * 60_000,
  });
  const reviews = useMemo(
    () => (data?.items ?? []).filter((review) => review.content?.trim()),
    [data],
  );

  useEffect(() => {
    if (!api) return;
    const sync = () => {
      setSnapCount(api.scrollSnapList().length);
      setSelected(api.selectedScrollSnap());
    };
    sync();
    api.on("select", sync);
    api.on("reInit", sync);
    return () => {
      api.off("select", sync);
      api.off("reInit", sync);
    };
  }, [api]);

  if (reviews.length === 0) return null;

  return (
    <section
      aria-labelledby="reviews-carousel-title"
      className={cn("relative overflow-hidden bg-white py-16 md:py-20", className)}
    >
      <div className="container mx-auto px-6">
        <AnimatedSection className="text-center mb-10 md:mb-12">
          <p className="text-gold text-xs uppercase tracking-[0.3em] font-medium mb-3">Opiniones</p>
          <h2 id="reviews-carousel-title" className="font-playfair text-3xl md:text-4xl font-bold">
            Lo que dicen nuestras <span className="italic text-gold">clientas</span>
          </h2>
        </AnimatedSection>

        <AnimatedSection delay={0.08}>
          <Carousel
            setApi={setApi}
            plugins={[autoplay]}
            opts={{ align: "start", loop: reviews.length > 1 }}
            className="mx-auto w-full max-w-6xl md:px-12"
          >
            <CarouselContent className="-ml-4">
              {reviews.map((review, index) => (
                <CarouselItem
                  key={`${review.created_at ?? "sin-fecha"}-${index}`}
                  className="pl-4 basis-[86%] sm:basis-1/2 lg:basis-1/3"
                >
                  <figure className="flex h-full flex-col rounded-2xl border border-gold/10 bg-white px-6 py-7 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
                    <Quote size={22} strokeWidth={1} className="text-gold/50 rotate-180 mb-4" aria-hidden />
                    <blockquote className="flex-1 font-playfair text-base md:text-lg italic leading-relaxed text-carbon/85 line-clamp-7 whitespace-pre-line">
                      {review.content}
                    </blockquote>
                    <figcaption className="mt-5 flex items-center gap-3">
                      <span className="h-px w-8 bg-gold/60" aria-hidden />
                      <span className="text-gold text-xs tracking-[0.15em] uppercase font-medium">
                        {review.author_name}
                      </span>
                    </figcaption>
                  </figure>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex h-10 w-10 left-0 border-gold/20 text-gold hover:bg-gold/10 hover:text-gold bg-white/90 [&_svg]:h-5 [&_svg]:w-5" />
            <CarouselNext className="hidden md:flex h-10 w-10 right-0 border-gold/20 text-gold hover:bg-gold/10 hover:text-gold bg-white/90 [&_svg]:h-5 [&_svg]:w-5" />
          </Carousel>

          {snapCount > 1 ? (
            <div className="mt-6 flex justify-center gap-2 md:hidden" aria-hidden>
              {Array.from({ length: snapCount }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    i === selected ? "w-6 bg-gold" : "w-2 bg-carbon/20",
                  )}
                />
              ))}
            </div>
          ) : null}

          <div className="mt-8 text-center">
            <Link
              to={TESTIMONIALS_PAGE_PATH}
              className="inline-flex items-center gap-2 text-sm font-medium tracking-wide text-gold hover:underline underline-offset-4"
            >
              Ver todas las opiniones
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
};

export default ReviewsCarousel;
