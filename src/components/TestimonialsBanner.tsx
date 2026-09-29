import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import AnimatedSection from "@/components/AnimatedSection";
import { useHeroCtaStyle } from "@/hooks/use-hero-cta-style";
import { fontStyle } from "@/lib/fonts";
import { SITE_CTA_CLASS } from "@/lib/site-cta";
import { TESTIMONIALS_PAGE_PATH } from "@/lib/testimonials";

/**
 * Portada de la sección de reseñas en la home. Las dos fotos ya traen las
 * miniaturas de resultados: la vertical (móvil) deja hueco abajo a la izquierda
 * para el texto y la horizontal (escritorio) entre la cara y las miniaturas.
 */
const TestimonialsBanner = () => {
  const heroCtaStyle = useHeroCtaStyle();

  return (
  <section
    aria-labelledby="testimonials-banner-title"
    className="md:py-16"
    style={{ backgroundColor: "var(--theme-section-testimonials-bg, #F9F7F2)" }}
  >
    <AnimatedSection className="md:container md:mx-auto md:px-6">
      <div className="relative overflow-hidden aspect-[900/1600] md:aspect-[1552/563] md:rounded-[1.25rem] md:shadow-[0_18px_40px_-24px_rgba(90,60,40,0.55)]">
        <picture>
          <source media="(min-width: 768px)" srcSet="/testimonios/resultados-escritorio.webp" type="image/webp" />
          <source media="(min-width: 768px)" srcSet="/testimonios/resultados-escritorio.jpg" />
          <source srcSet="/testimonios/resultados-movil.webp" type="image/webp" />
          <img
            src="/testimonios/resultados-movil.jpg"
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </picture>

        <div
          className="absolute left-[6%] right-[35%] top-[55%] bottom-[7%] flex flex-col justify-center md:left-[62%] md:right-[19.5%] md:inset-y-0"
          style={fontStyle("poppins")}
        >
          <h2
            id="testimonials-banner-title"
            className="font-semibold leading-[1.05] tracking-tight !text-[#6a4e3f] text-[clamp(1.75rem,9vw,3rem)] md:text-[clamp(1.5rem,2.7vw,2.75rem)]"
          >
            Resultados reales
          </h2>
          <div
            aria-hidden
            className="mt-[5%] mb-[6%] h-[2px] w-16 md:mt-4 md:mb-4 md:w-20 bg-gradient-to-r from-[#e2ad93] to-[#e2ad93]/0 md:from-[#b9826a] md:to-[#b9826a]/0"
          />
          <p className="uppercase leading-relaxed tracking-[0.14em] text-[#7a5f50] text-[clamp(0.625rem,2.9vw,0.95rem)] md:text-[#6a4e3f] md:text-[clamp(0.625rem,0.85vw,0.85rem)]">
            Una comunidad que confía en Shenna Brows.
          </p>
          <Link
            to={TESTIMONIALS_PAGE_PATH}
            className={`${SITE_CTA_CLASS} mt-[8%] w-fit md:mt-4 md:px-3 md:tracking-[0.14em] lg:px-4 lg:tracking-[0.22em] xl:mt-6 xl:px-7`}
            style={heroCtaStyle}
          >
            Ver opiniones
            <ArrowRight aria-hidden className="h-4 w-4 md:hidden lg:block xl:h-5 xl:w-5" strokeWidth={1.75} />
          </Link>
        </div>
      </div>
    </AnimatedSection>
  </section>
  );
};

export default TestimonialsBanner;
