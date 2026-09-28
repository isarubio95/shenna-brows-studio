import { useMemo } from "react";
import {
  splitHeadlineByAccents,
  type CollectionHeadlineConfig,
} from "@/lib/collection-headline-content";
import { fontStyle } from "@/lib/fonts";

interface CollectionHeadlineProps {
  config: Pick<
    CollectionHeadlineConfig,
    "text" | "accent" | "color" | "accentColor" | "accentScale" | "fonts"
  >;
  /** Valor CSS de `font-size` para el texto base. */
  fontSize: string;
  className?: string;
}

const CollectionHeadline = ({ config, fontSize, className = "" }: CollectionHeadlineProps) => {
  const segments = useMemo(
    () => splitHeadlineByAccents(config.text, config.accent),
    [config.text, config.accent],
  );

  return (
    <p
      className={`font-playfair font-black text-center leading-[1.15] tracking-[-0.02em] [text-wrap:balance] ${className}`}
      style={{ color: config.color, fontSize, ...fontStyle(config.fonts.text) }}
    >
      {segments.map((segment, i) =>
        segment.accent ? (
          <span
            key={i}
            className="leading-[0.9]"
            style={{
              color: config.accentColor,
              fontSize: `${config.accentScale / 100}em`,
              ...fontStyle(config.fonts.accent),
            }}
          >
            {segment.text}
          </span>
        ) : (
          segment.text
        ),
      )}
    </p>
  );
};

export default CollectionHeadline;
