import { useEffect } from "react";

declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } };
  }
}

const EMBED_SCRIPT_SRC = "https://www.instagram.com/embed.js";

/** Permalink oficial de la publicación (embed de Instagram). */
const INSTAGRAM_PERMALINK =
  "https://www.instagram.com/p/DQ974-zDOEi/?utm_source=ig_embed&utm_campaign=loading";

type InstagramPostEmbedProps = {
  className?: string;
};

/**
 * Inserta el embed oficial de Instagram. Requiere cargar embed.js y llamar a instgrm.Embeds.process().
 */
const InstagramPostEmbed = ({ className = "" }: InstagramPostEmbedProps) => {
  useEffect(() => {
    let cancelled = false;

    const process = () => {
      if (!cancelled) {
        window.instgrm?.Embeds?.process();
      }
    };

    const runAfterPaint = () => {
      requestAnimationFrame(() => {
        setTimeout(process, 0);
      });
    };

    let script = document.querySelector<HTMLScriptElement>(`script[src="${EMBED_SCRIPT_SRC}"]`);

    if (!script) {
      script = document.createElement("script");
      script.async = true;
      script.src = EMBED_SCRIPT_SRC;
      script.addEventListener("load", runAfterPaint);
      document.body.appendChild(script);
    } else {
      runAfterPaint();
    }

    return () => {
      cancelled = true;
      script?.removeEventListener("load", runAfterPaint);
    };
  }, []);

  return (
    <div className={`flex flex-col items-center w-full ${className}`}>
      <p className="text-gold text-sm uppercase tracking-[0.3em] font-medium text-center mb-5 md:mb-6">
        Instagram
      </p>
      <div className="w-full max-w-[540px] rounded-2xl border border-gold/25 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.06)] overflow-hidden">
        <blockquote
          className="instagram-media !m-0 !max-w-none w-full min-w-[280px] sm:min-w-[326px] border-0 shadow-none p-0 bg-transparent"
          data-instgrm-captioned
          data-instgrm-permalink={INSTAGRAM_PERMALINK}
          data-instgrm-version="14"
        >
          <div className="px-5 py-6">
            <a
              href={INSTAGRAM_PERMALINK}
              className="block w-full text-center no-underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="text-sm font-medium tracking-wide text-gold hover:text-gold/90 transition-colors font-sans">
                Ver esta publicación en Instagram
              </span>
            </a>
            <p className="mt-4 mb-0 text-center text-xs sm:text-sm text-carbon/50 leading-snug font-sans px-1">
              <a
                href={INSTAGRAM_PERMALINK}
                className="text-carbon/50 hover:text-gold transition-colors no-underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Alexandra Lasheras (@alexandralasherasmicro)
              </a>
            </p>
          </div>
        </blockquote>
      </div>
    </div>
  );
};

export default InstagramPostEmbed;
