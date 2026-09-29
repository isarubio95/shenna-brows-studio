import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROMO_CODE_BANNER,
  parsePromoCodeBannerConfig,
  serializePromoCodeBannerConfig,
} from "./promo-code-banner-content";

describe("promo-code-banner-content", () => {
  it("roundtrips the default banner", () => {
    const parsed = parsePromoCodeBannerConfig(
      serializePromoCodeBannerConfig(DEFAULT_PROMO_CODE_BANNER),
    );
    expect(parsed).toEqual(DEFAULT_PROMO_CODE_BANNER);
  });

  it("falls back to defaults when the payload is empty or invalid JSON", () => {
    expect(parsePromoCodeBannerConfig(null)).toEqual(DEFAULT_PROMO_CODE_BANNER);
    expect(parsePromoCodeBannerConfig("")).toEqual(DEFAULT_PROMO_CODE_BANNER);
    expect(parsePromoCodeBannerConfig("{")).toEqual(DEFAULT_PROMO_CODE_BANNER);
  });

  it("has no code by default, so the section stays hidden until one is chosen", () => {
    expect(DEFAULT_PROMO_CODE_BANNER.code).toBe("");
  });

  it("keeps the saved edits and rejects invalid values field by field", () => {
    const parsed = parsePromoCodeBannerConfig(
      JSON.stringify({
        enabled: false,
        title: "  ¿Primera vez? ",
        subtitle: "",
        code: "  first10 ",
        copyText: "   ",
        copiedText: "Hecho",
        backgroundColor: "rosa",
        buttonBg: "#FFF",
        fonts: { title: "no-existe", button: "inter" },
      }),
    );
    expect(parsed.enabled).toBe(false);
    expect(parsed.title).toBe("¿Primera vez?");
    // El subtítulo se puede dejar vacío a propósito; el botón necesita texto.
    expect(parsed.subtitle).toBe("");
    expect(parsed.copyText).toBe(DEFAULT_PROMO_CODE_BANNER.copyText);
    expect(parsed.copiedText).toBe("Hecho");
    // Igual que en `discount_codes`: sin espacios y en mayúsculas.
    expect(parsed.code).toBe("FIRST10");
    expect(parsed.backgroundColor).toBe(DEFAULT_PROMO_CODE_BANNER.backgroundColor);
    expect(parsed.buttonBg).toBe("#FFF");
    expect(parsed.fonts).toEqual({ title: "", subtitle: "", code: "", button: "inter" });
  });

  it("normalizes the code when saving", () => {
    const saved = JSON.parse(
      serializePromoCodeBannerConfig({ ...DEFAULT_PROMO_CODE_BANNER, code: " bienvenida10" }),
    );
    expect(saved.code).toBe("BIENVENIDA10");
  });
});
