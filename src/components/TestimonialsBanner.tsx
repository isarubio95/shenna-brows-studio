import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import AnimatedSection from "@/components/AnimatedSection";
import { useHeroCtaStyle } from "@/hooks/use-hero-cta-style";
import { fontStyle } from "@/lib/fonts";
import { SITE_CTA_CLASS } from "@/lib/site-cta";
import { TESTIMONIALS_PAGE_PATH } from "@/lib/testimonials";

const RESULT_THUMBNAILS = [1, 2, 3].map((n) => `/testimonios/resultado-${n}`);

/**
 * Portada de la sección de reseñas en la home. En móvil la foto vertical ya trae
 * las miniaturas y deja hueco a la izquierda para el texto; en escritorio se
 * compone la tarjeta horizontal con la foto del ojo, el panel y las miniaturas.
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
      <div className="relative overflow-hidden aspect-[941/1672] md:aspect-auto md:h-[clamp(340px,34vw,460px)] md:rounded-[2rem] md:bg-[linear-gradient(160deg,#c9a58d_0%,#b39380_55%,#a0826e_100%)] md:shadow-[0_18px_40px_-24px_rgba(90,60,40,0.55)]">
        <picture className="md:hidden">
          <source srcSet="/testimonios/resultados-movil.webp" type="image/webp" />
          <img
            src="/testimonios/resultados-movil.jpg"
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </picture>

        <picture className="hidden md:block">
          <source srcSet="/testimonios/resultados-ojo.webp" type="image/webp" />
          <img
            src="/testimonios/resultados-ojo.jpg"
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-y-0 left-0 h-full w-[44%] object-cover object-[35%_center] [mask-image:linear-gradient(to_right,#000_78%,transparent)]"
          />
        </picture>

        <div
          className="absolute left-[6%] right-[35%] top-[55%] bottom-[7%] flex flex-col justify-center md:left-[46%] md:right-[23%] md:inset-y-0"
          style={fontStyle("poppins")}
        >
          <h2
            id="testimonials-banner-title"
            className="font-semibold leading-[1.05] tracking-tight !text-[#6a4e3f] text-[clamp(1.75rem,9vw,3rem)] md:!text-white md:text-[clamp(2.25rem,4.2vw,4rem)]"
          >
            Resultados reales
          </h2>
          <div
            aria-hidden
            className="mt-[5%] mb-[6%] h-[2px] w-16 md:mt-5 md:mb-5 md:w-28 bg-gradient-to-r from-[#e2ad93] to-[#e2ad93]/0 md:from-[#f3c9b2] md:to-[#f3c9b2]/0"
          />
          <p className="uppercase leading-relaxed tracking-[0.14em] text-[#7a5f50] text-[clamp(0.625rem,2.9vw,0.95rem)] md:text-white/90 md:text-[clamp(0.75rem,1.1vw,1rem)] md:max-w-[32ch]">
            Una comunidad que confía en Shenna Brows.
          </p>
          <Link
            to={TESTIMONIALS_PAGE_PATH}
            className={`${SITE_CTA_CLASS} mt-[8%] w-fit md:mt-8`}
            style={heroCtaStyle}
          >
            Ver opiniones
            <ArrowRight aria-hidden className="h-4 w-4 md:h-5 md:w-5" strokeWidth={1.75} />
          </Link>
        </div>

        <div className="absolute inset-y-0 right-0 hidden w-[19%] max-w-[240px] flex-col gap-3 py-5 pr-5 md:flex">
          {RESULT_THUMBNAILS.map((base) => (
            <picture key={base} className="min-h-0 flex-1">
              <source srcSet={`${base}.webp`} type="image/webp" />
              <img
                src={`${base}.jpg`}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-full w-full rounded-xl object-cover shadow-[0_8px_18px_-10px_rgba(60,35,20,0.6)] ring-1 ring-white/25"
              />
            </picture>
          ))}
        </div>
      </div>
    </AnimatedSection>
  </section>
  );
};

export default TestimonialsBanner;
