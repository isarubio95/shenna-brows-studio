import { useMemo } from "react";
import { useSiteContent } from "@/hooks/use-site-content";
import { parseHeroConfig } from "@/lib/hero-content";
import { siteCtaStyle } from "@/lib/site-cta";

/** Colores del CTA del hero, para repetir el mismo botón en el resto del sitio. */
export function useHeroCtaStyle() {
  const { data } = useSiteContent(["index_hero"]);
  return useMemo(() => {
    const hero = parseHeroConfig(data.index_hero?.content);
    return siteCtaStyle(hero.ctaBg, hero.ctaTextColor);
  }, [data.index_hero?.content]);
}
