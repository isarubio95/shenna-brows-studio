import { describe, expect, it } from "vitest";
import { parseCampaignConfig, serializeCampaignConfig } from "@/lib/campaign-content";
import { parseElixirSpotlightConfig, serializeElixirSpotlightConfig } from "@/lib/elixir-spotlight-content";
import { parseHeroConfig, serializeHeroConfig } from "@/lib/hero-content";
import { parsePromoCodeBannerConfig, serializePromoCodeBannerConfig } from "@/lib/promo-code-banner-content";
import { parseTestimonialsBannerConfig, serializeTestimonialsBannerConfig } from "@/lib/testimonials-banner-content";
import { parseTiendaHeroConfig, serializeTiendaHeroConfig } from "@/lib/tienda-hero-content";

const sections = [
  ["hero", parseHeroConfig, serializeHeroConfig, "ctaVisible"],
  ["tienda", parseTiendaHeroConfig, serializeTiendaHeroConfig, "ctaVisible"],
  ["campaña", parseCampaignConfig, serializeCampaignConfig, "ctaVisible"],
  ["testimonios", parseTestimonialsBannerConfig, serializeTestimonialsBannerConfig, "ctaVisible"],
  ["elixir", parseElixirSpotlightConfig, serializeElixirSpotlightConfig, "ctaVisible"],
  ["código promo", parsePromoCodeBannerConfig, serializePromoCodeBannerConfig, "buttonVisible"],
] as const;

const flag = (config: object, key: string) => (config as Record<string, unknown>)[key];

describe.each(sections)("botón visible en %s", (_name, parse, serialize, key) => {
  it("se muestra por defecto y en configs guardadas antes del interruptor", () => {
    expect(flag(parse(null), key)).toBe(true);
    expect(flag(parse("{}"), key)).toBe(true);
  });

  it("conserva el botón oculto al guardar y volver a leer", () => {
    const hidden = { ...parse(null), [key]: false };
    const roundTrip = parse((serialize as (c: typeof hidden) => string)(hidden));
    expect(flag(roundTrip, key)).toBe(false);
  });
});
