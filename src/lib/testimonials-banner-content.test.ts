import { describe, expect, it } from "vitest";
import {
  DEFAULT_TESTIMONIALS_BANNER,
  bundledWebpFor,
  parseTestimonialsBannerConfig,
  serializeTestimonialsBannerConfig,
} from "./testimonials-banner-content";

describe("testimonials-banner-content", () => {
  it("roundtrips the default banner", () => {
    const parsed = parseTestimonialsBannerConfig(
      serializeTestimonialsBannerConfig(DEFAULT_TESTIMONIALS_BANNER),
    );
    expect(parsed).toEqual(DEFAULT_TESTIMONIALS_BANNER);
  });

  it("falls back to defaults when the payload is empty or invalid JSON", () => {
    expect(parseTestimonialsBannerConfig(null)).toEqual(DEFAULT_TESTIMONIALS_BANNER);
    expect(parseTestimonialsBannerConfig("")).toEqual(DEFAULT_TESTIMONIALS_BANNER);
    expect(parseTestimonialsBannerConfig("{")).toEqual(DEFAULT_TESTIMONIALS_BANNER);
  });

  it("keeps the saved edits and rejects invalid values field by field", () => {
    const parsed = parseTestimonialsBannerConfig(
      JSON.stringify({
        enabled: false,
        title: "  Antes y después ",
        titleColor: "rojo",
        subtitle: "",
        ctaText: "   ",
        ctaHref: "/tienda",
        textScale: 500,
        fonts: { title: "no-existe", cta: "poppins" },
      }),
    );
    expect(parsed.enabled).toBe(false);
    expect(parsed.title).toBe("Antes y después");
    expect(parsed.titleColor).toBe(DEFAULT_TESTIMONIALS_BANNER.titleColor);
    // El subtítulo se puede dejar vacío a propósito; el botón necesita texto.
    expect(parsed.subtitle).toBe("");
    expect(parsed.ctaText).toBe(DEFAULT_TESTIMONIALS_BANNER.ctaText);
    expect(parsed.ctaHref).toBe("/tienda");
    expect(parsed.textScale).toBe(160);
    expect(parsed.fonts).toEqual({ title: "", subtitle: "", cta: "poppins" });
  });

  it("keeps the text block inside the photo", () => {
    const parsed = parseTestimonialsBannerConfig(
      JSON.stringify({ textPosX: 90, textWidth: 30, textPosMobileX: -10, textWidthMobile: 2 }),
    );
    expect(parsed.textPosX + parsed.textWidth).toBeLessThanOrEqual(100);
    expect(parsed.textPosX).toBe(70);
    expect(parsed.textPosMobileX).toBe(0);
    expect(parsed.textWidthMobile).toBe(10);
  });

  it("only maps bundled JPGs to their WebP sibling", () => {
    expect(bundledWebpFor("/testimonios/resultados-movil.jpg")).toBe(
      "/testimonios/resultados-movil.webp",
    );
    expect(bundledWebpFor("https://cdn.example.com/foto.jpg")).toBeNull();
    expect(bundledWebpFor("/testimonios/subida.webp")).toBeNull();
  });
});
