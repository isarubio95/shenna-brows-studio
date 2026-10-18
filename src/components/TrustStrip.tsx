import { useMemo } from "react";
import MarketingIcon from "@/components/MarketingIcon";
import { useSiteContentValue } from "@/hooks/use-site-content";
import {
  TRUST_STRIP_CONTENT_KEY,
  parseTrustStripConfig,
  type TrustStripConfig,
} from "@/lib/trust-strip-content";
import { cn } from "@/lib/utils";

export type TrustStripVariant = "full" | "compact";

interface TrustStripViewProps {
  config: TrustStripConfig;
  /** `full`: franja de cuatro en fila. `compact`: «Tus ventajas…» de la ficha de producto. */
  variant?: TrustStripVariant;
  /** Vista previa en el panel: se pinta aunque esté desactivada. */
  preview?: boolean;
  className?: string;
}

export function TrustStripView({
  config,
  variant = "full",
  preview = false,
  className,
}: TrustStripViewProps) {
  const items = config.items.filter((item) => item.title.trim());
  if ((!config.enabled && !preview) || items.length === 0) return null;

  if (variant === "compact") {
    return (
      <section
        aria-labelledby={preview ? undefined : "trust-strip-compact-title"}
        className={cn("border-t border-gold/10 py-6", className)}
      >
        <h2
          id={preview ? undefined : "trust-strip-compact-title"}
          className="font-playfair text-lg font-semibold leading-snug mb-4"
        >
          {config.compactHeading}
        </h2>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-4">
          {items.map((item, index) => (
            <li key={`${index}-${item.title}`} className="flex items-start gap-2.5">
              <MarketingIcon id={item.icon} className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
              <div className="min-w-0">
                <p className="text-sm font-medium leading-snug text-carbon/85">
                  {item.compactTitle || item.title}
                </p>
                {item.compactSubtitle ? (
                  <p className="mt-0.5 text-xs leading-snug text-carbon/55">{item.compactSubtitle}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <section
      aria-label="Ventajas de comprar en Shenna"
      className={cn("border-b border-gold/10 bg-white", className)}
    >
      <div className="container mx-auto px-6 py-9 md:py-12">
        <ul
          className={cn(
            "mx-auto grid max-w-5xl gap-x-5 gap-y-8 md:gap-x-10",
            items.length === 1
              ? "grid-cols-1"
              : items.length === 3
                ? "grid-cols-2 md:grid-cols-3"
                : "grid-cols-2 md:grid-cols-4",
          )}
        >
          {items.map((item, index) => (
            <li key={`${index}-${item.title}`} className="flex flex-col items-center text-center">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-gold/10">
                <MarketingIcon id={item.icon} className="h-5 w-5 text-gold" />
              </span>
              <p className="mt-3 font-playfair text-base font-semibold leading-snug text-gold md:text-lg">
                {item.title}
              </p>
              {item.subtitle ? (
                <p className="mt-1.5 max-w-52 text-xs leading-relaxed text-carbon/60 md:text-sm">
                  {item.subtitle}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Franja de confianza con el contenido guardado en el panel. */
const TrustStrip = ({ variant = "full", className }: { variant?: TrustStripVariant; className?: string }) => {
  const content = useSiteContentValue(TRUST_STRIP_CONTENT_KEY);
  const config = useMemo(() => parseTrustStripConfig(content), [content]);
  return <TrustStripView config={config} variant={variant} className={className} />;
};

export default TrustStrip;
