import { useMemo } from "react";
import AnimatedSection from "@/components/AnimatedSection";
import { useSiteContentValue } from "@/hooks/use-site-content";
import {
  VALUE_PROPOSITION_CONTENT_KEY,
  parseValuePropositionConfig,
  type ValuePropositionConfig,
} from "@/lib/value-proposition-content";

export function ValuePropositionView({
  config,
  preview = false,
}: {
  config: ValuePropositionConfig;
  /** Vista previa en el panel: se pinta aunque esté oculta. */
  preview?: boolean;
}) {
  if (!config.enabled && !preview) return null;

  const content = (
    <div className="mx-auto max-w-3xl text-center">
      {config.eyebrow ? (
        <p className="text-gold text-xs uppercase tracking-[0.3em] font-medium mb-4">{config.eyebrow}</p>
      ) : null}
      <p className="font-cormorant text-2xl italic leading-snug text-carbon/85 md:text-[2.1rem]">
        {config.text}
      </p>
      <span className="mx-auto mt-6 block h-px w-16 bg-gold/50" aria-hidden />
    </div>
  );

  return (
    <section aria-label="Propuesta de valor" className="bg-white py-14 md:py-20">
      <div className="container mx-auto px-6">
        {preview ? content : <AnimatedSection>{content}</AnimatedSection>}
      </div>
    </section>
  );
}

/** Propuesta de valor del inicio (oculta hasta que llegue el texto definitivo). */
const ValueProposition = () => {
  const content = useSiteContentValue(VALUE_PROPOSITION_CONTENT_KEY);
  const config = useMemo(() => parseValuePropositionConfig(content), [content]);
  return <ValuePropositionView config={config} />;
};

export default ValueProposition;
