import { useMemo, type ReactNode } from "react";
import AnimatedSection from "@/components/AnimatedSection";
import MarketingIcon from "@/components/MarketingIcon";
import { useSiteContentValue } from "@/hooks/use-site-content";
import {
  BRAND_VALUES_CONTENT_KEY,
  parseBrandValuesConfig,
  type BrandValuesConfig,
} from "@/lib/brand-values-content";
import { splitHeadlineByAccent } from "@/lib/collection-headline-content";
import { cn } from "@/lib/utils";

/** En la vista previa del panel no hay animación de entrada. */
const StaticWrap = ({ children, className }: { children: ReactNode; className?: string; delay?: number }) => (
  <div className={className}>{children}</div>
);

interface BrandValuesViewProps {
  config: BrandValuesConfig;
  /** Vista previa en el panel: se pinta aunque esté desactivado y sin animación. */
  preview?: boolean;
}

export function BrandValuesView({ config, preview = false }: BrandValuesViewProps) {
  const cards = config.cards.filter((card) => card.title.trim());
  if ((!config.enabled && !preview) || cards.length === 0) return null;

  const titleParts = splitHeadlineByAccent(config.title, config.titleAccent);
  const Wrap = preview ? StaticWrap : AnimatedSection;

  return (
    <section
      aria-labelledby={preview ? undefined : "brand-values-title"}
      // Rosa de la marca con letras blancas, como el resto de la web (clienta, 18/10).
      className="brand-values-section bg-gold py-16 md:py-24"
    >
      <div className="container mx-auto px-6">
        <Wrap className="text-center">
          {config.eyebrow ? (
            <div className="flex items-center justify-center gap-4">
              <span className="h-px w-8 bg-white/50 sm:w-14" aria-hidden />
              <p className="text-white text-[0.7rem] uppercase tracking-[0.32em] font-medium">{config.eyebrow}</p>
              <span className="h-px w-8 bg-white/50 sm:w-14" aria-hidden />
            </div>
          ) : null}
          <h2
            id={preview ? undefined : "brand-values-title"}
            className="mt-4 font-playfair text-3xl leading-tight md:text-5xl"
          >
            {titleParts ? (
              <>
                {titleParts.before}
                <span className="italic">{titleParts.accent}</span>
                {titleParts.after}
              </>
            ) : (
              config.title
            )}
          </h2>
          {config.keywords ? (
            <p className="mt-4 text-[0.65rem] uppercase tracking-[0.32em] text-white/90 sm:text-xs sm:tracking-[0.4em]">
              {config.keywords}
            </p>
          ) : null}
        </Wrap>

        <Wrap delay={0.08} className="mt-12 md:mt-14">
          <ul
            className={cn(
              "mx-auto grid max-w-7xl grid-cols-2 gap-x-3 gap-y-6 md:gap-0 md:overflow-hidden md:rounded-2xl md:ring-1 md:ring-white/25",
              cards.length >= 4 ? "md:grid-cols-4" : cards.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2",
            )}
          >
            {cards.map((card, index) => (
              <li
                key={`${index}-${card.title}`}
                className="flex flex-col overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/25 md:rounded-none md:ring-0 md:border-l md:border-white/25 md:first:border-l-0"
              >
                {card.imageUrl ? (
                  <div className="aspect-4/3 overflow-hidden bg-white/10 md:aspect-[483/250]">
                    <img
                      src={card.imageUrl}
                      alt={card.imageAlt}
                      loading={preview ? undefined : "lazy"}
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : null}
                <div
                  className={cn(
                    "relative flex flex-1 flex-col items-center px-3 pb-5 text-center sm:px-5 md:px-6 md:pb-9",
                    card.imageUrl ? "pt-8 md:pt-12" : "pt-6",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-11 w-11 place-items-center rounded-full bg-white shadow-[0_6px_16px_-8px_rgba(90,40,50,0.45)] ring-4 ring-gold md:h-16 md:w-16",
                      card.imageUrl && "absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2",
                      !card.imageUrl && "mb-3",
                    )}
                  >
                    <MarketingIcon id={card.icon} className="h-5 w-5 text-gold md:h-7 md:w-7" />
                  </span>
                  <h3 className="font-cormorant text-[1.15rem] font-semibold leading-tight md:text-[1.75rem]">
                    {card.title}
                  </h3>
                  {card.text ? (
                    <p className="mt-2 text-xs font-medium leading-relaxed text-white/90 md:mt-3 md:text-sm">{card.text}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </Wrap>
      </div>
    </section>
  );
}

/** «Nuestros valores» con el contenido guardado en el panel. */
const BrandValues = () => {
  const content = useSiteContentValue(BRAND_VALUES_CONTENT_KEY);
  const config = useMemo(() => parseBrandValuesConfig(content), [content]);
  return <BrandValuesView config={config} />;
};

export default BrandValues;
