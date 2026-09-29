import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Loader2, Quote } from "lucide-react";
import AnimatedSection from "@/components/AnimatedSection";
import { useHeroCtaStyle } from "@/hooks/use-hero-cta-style";
import { SITE_CTA_CLASS } from "@/lib/site-cta";
import { useAuth } from "@/context/AuthContext";
import {
  fetchFeaturedTestimonials,
  nextTestimonialsPage,
} from "@/lib/testimonials";

const SEO_TITLE = "Testimonios | Shenna Brows";
const SEO_DESCRIPTION =
  "Opiniones reales de clientas que ya usan las herramientas de cejas Shenna Brows.";

const Testimonials = () => {
  const { user } = useAuth();
  const heroCtaStyle = useHeroCtaStyle();
  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["featured-testimonials"],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => fetchFeaturedTestimonials(pageParam),
    getNextPageParam: (lastPage, _pages, lastPageParam) =>
      nextTestimonialsPage(lastPage, lastPageParam),
  });

  const testimonials = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data],
  );

  useEffect(() => {
    document.title = SEO_TITLE;
    document.head
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", SEO_DESCRIPTION);
  }, []);

  return (
    <main
      className="min-h-screen pt-40 pb-24"
      style={{ backgroundColor: "var(--theme-section-testimonials-bg, #F9F7F2)" }}
    >
      <div className="container mx-auto px-6 max-w-3xl">
        <AnimatedSection>
          <p className="text-gold text-sm uppercase tracking-[0.3em] font-medium text-center mb-4">
            Testimonios
          </p>
          <h1 className="font-playfair text-4xl md:text-5xl font-bold text-carbon text-center leading-tight mb-4">
            Lo que dicen nuestras <span className="italic text-gold">clientas</span>
          </h1>
          <p className="text-carbon/55 text-base md:text-lg text-center leading-relaxed mb-14">
            Resultados reales de una comunidad que confía en Shenna Brows.
          </p>
        </AnimatedSection>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-gold" aria-label="Cargando testimonios" />
          </div>
        ) : isError ? (
          <p className="text-center text-carbon/60 py-12">
            No hemos podido cargar las reseñas. Inténtalo de nuevo en unos minutos.
          </p>
        ) : testimonials.length === 0 ? (
          <p className="text-center text-carbon/60 py-12">
            Todavía no hay reseñas publicadas.
          </p>
        ) : (
          <ul className="space-y-6">
            {testimonials.map((t, index) => (
              <li key={`${t.created_at ?? "sin-fecha"}-${index}`}>
                <figure className="rounded-2xl border border-gold/10 bg-white px-6 py-7 md:px-10 md:py-9">
                  <Quote size={24} strokeWidth={1} className="text-gold/50 rotate-180 mb-4" aria-hidden />
                  <blockquote className="font-playfair text-lg md:text-xl italic text-carbon/85 leading-relaxed whitespace-pre-line">
                    {t.content}
                  </blockquote>
                  <figcaption className="mt-5 flex items-center gap-3">
                    <span className="h-px w-8 bg-gold/60" aria-hidden />
                    <span className="text-gold text-sm tracking-[0.15em] uppercase font-medium">
                      {t.author_name}
                    </span>
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
        )}

        {hasNextPage ? (
          <div className="mt-10 flex justify-center">
            <button
              type="button"
              onClick={() => void fetchNextPage()}
              disabled={isFetchingNextPage}
              className={`${SITE_CTA_CLASS} disabled:opacity-60`}
              style={heroCtaStyle}
            >
              {isFetchingNextPage ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              Ver más opiniones
            </button>
          </div>
        ) : null}

        {!isLoading ? (
          <AnimatedSection delay={0.08}>
            <section className="mt-20 rounded-2xl border border-gold/15 bg-white px-6 py-10 md:px-10 text-center">
              <h2 className="font-playfair text-2xl md:text-3xl font-bold text-carbon mb-3">
                ¿Ya has probado Shenna Brows?
              </h2>
              <p className="text-carbon/60 leading-relaxed max-w-xl mx-auto mb-7">
                Cuéntanos tu experiencia desde tu área privada. La publicaremos aquí en cuanto la revisemos.
              </p>
              <Link
                to={user ? "/account" : "/login"}
                className={SITE_CTA_CLASS}
                style={heroCtaStyle}
              >
                Dejar mi reseña
              </Link>
            </section>
          </AnimatedSection>
        ) : null}
      </div>
    </main>
  );
};

export default Testimonials;
