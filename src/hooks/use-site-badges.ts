import { useLayoutEffect, useMemo } from "react";
import { useSiteContentValue } from "@/hooks/use-site-content";
import {
  DEFAULT_SALE_BADGE,
  parseSiteBadgesConfig,
  type SiteBadgesConfig,
} from "@/lib/badges-content";

export function useSiteBadges(): SiteBadgesConfig {
  const content = useSiteContentValue("site_badges");
  const config = useMemo(() => parseSiteBadgesConfig(content), [content]);

  // Antes del pintado: la etiqueta no llega a verse con el color por defecto.
  useLayoutEffect(() => {
    document.documentElement.style.setProperty(
      "--sale-badge-bg",
      config.sale.background || DEFAULT_SALE_BADGE.background,
    );
  }, [config.sale.background]);

  return config;
}
