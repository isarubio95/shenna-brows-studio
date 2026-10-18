import { useMemo } from "react";
import { useSiteContentValue } from "@/hooks/use-site-content";
import {
  ELIXIR_SPOTLIGHT_CONTENT_KEY,
  parseElixirSpotlightConfig,
  type ElixirSpotlightConfig,
} from "@/lib/elixir-spotlight-content";

/** Bloque del producto protagonista guardado en el panel (o el de por defecto). */
export function useElixirSpotlight(): ElixirSpotlightConfig {
  const content = useSiteContentValue(ELIXIR_SPOTLIGHT_CONTENT_KEY);
  return useMemo(() => parseElixirSpotlightConfig(content), [content]);
}
