import { useEffect, useRef, useState } from "react";
import AnimatedSection from "@/components/AnimatedSection";
import { useToast } from "@/hooks/use-toast";
import { fontStyle } from "@/lib/fonts";
import type { PromoCodeBannerConfig } from "@/lib/promo-code-banner-content";
import { cn } from "@/lib/utils";

/** Se ve en el panel mientras no hay código asociado. */
const PREVIEW_PLACEHOLDER_CODE = "TUCODIGO";
const COPIED_FEEDBACK_MS = 2500;

async function copyToClipboard(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    // Sin permiso o contexto no seguro: el método antiguo aún funciona en muchos navegadores.
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      return document.execCommand("copy");
    } catch {
      return false;
    } finally {
      textarea.remove();
    }
  }
}

interface PromoCodeBannerProps {
  config: PromoCodeBannerConfig;
  /** Vista previa en admin: sin animación y con un código de ejemplo si falta. */
  preview?: boolean;
}

/**
 * Franja con un código de descuento y un botón para copiarlo. Usa container
 * queries en lugar de `md:` para que la vista previa del panel, que se pinta a
 * ancho de móvil o de escritorio, sea fiel.
 */
const PromoCodeBanner = ({ config, preview = false }: PromoCodeBannerProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLSpanElement>(null);
  const resetTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(resetTimer.current), []);

  const code = config.code || (preview ? PREVIEW_PLACEHOLDER_CODE : "");
  if (!preview && (!config.enabled || !code)) return null;

  const handleCopy = async () => {
    if (await copyToClipboard(code)) {
      setCopied(true);
      window.clearTimeout(resetTimer.current);
      resetTimer.current = window.setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
      return;
    }
    // Deja el código seleccionado para que se pueda copiar a mano.
    const node = codeRef.current;
    const selection = window.getSelection();
    if (node && selection) {
      const range = document.createRange();
      range.selectNodeContents(node);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    toast({
      title: "No se pudo copiar",
      description: "Hemos seleccionado el código: cópialo manualmente.",
      variant: "destructive",
    });
  };

  const content = (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-8 @3xl:flex-row @3xl:items-center @3xl:justify-between @3xl:gap-12 @3xl:px-10 @3xl:py-12">
      <div className="min-w-0">
        <h2
          id={preview ? undefined : "promo-code-banner-title"}
          className="text-xl font-bold leading-tight @3xl:text-3xl"
          style={{ color: config.titleColor, ...fontStyle(config.fonts.title) }}
        >
          {config.title}
        </h2>
        {config.subtitle ? (
          <p
            className="mt-3 text-base leading-snug @3xl:text-lg"
            style={{ color: config.subtitleColor, ...fontStyle(config.fonts.subtitle) }}
          >
            {config.subtitle}
          </p>
        ) : null}
      </div>

      <div className="flex w-full items-center gap-2.5 @3xl:w-auto @3xl:shrink-0 @3xl:gap-3">
        <span
          ref={codeRef}
          className="flex min-h-10 min-w-0 flex-1 select-all items-center justify-center border-[1.5px] border-dashed px-3 text-base font-bold tracking-[0.08em] @3xl:min-h-14 @3xl:min-w-72 @3xl:border-2 @3xl:px-6 @3xl:text-lg"
          style={{
            color: config.codeColor,
            borderColor: config.codeColor,
            ...fontStyle(config.fonts.code),
          }}
        >
          {code}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex min-h-11 shrink-0 items-center justify-center px-5 text-[0.95rem] font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.16)] transition-[filter,transform] duration-200 hover:brightness-95 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 @3xl:min-h-14 @3xl:px-8 @3xl:text-base"
          style={{
            backgroundColor: config.buttonBg,
            color: config.buttonTextColor,
            ...fontStyle(config.fonts.button),
          }}
        >
          {/* Ambos textos ocupan la misma celda: el botón no cambia de ancho al copiar. */}
          <span className="grid">
            <span className={cn("col-start-1 row-start-1", copied && "invisible")}>
              {config.copyText}
            </span>
            <span className={cn("col-start-1 row-start-1", !copied && "invisible")}>
              {config.copiedText}
            </span>
          </span>
        </button>
        <span className="sr-only" aria-live="polite">
          {copied ? `Código ${code} copiado` : ""}
        </span>
      </div>
    </div>
  );

  const background = {
    backgroundColor: config.backgroundColor,
    backgroundImage: `linear-gradient(to bottom, ${config.backgroundColor}, ${config.backgroundColorEnd})`,
  };

  if (preview) {
    return (
      <div className="@container" style={background}>
        {content}
      </div>
    );
  }

  return (
    <section aria-labelledby="promo-code-banner-title" className="@container" style={background}>
      <AnimatedSection>{content}</AnimatedSection>
    </section>
  );
};

export default PromoCodeBanner;
