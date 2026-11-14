import { describe, expect, it } from "vitest";
import {
  DEFAULT_WELCOME_POPUP,
  parseWelcomePopupConfig,
  serializeWelcomePopupConfig,
  welcomePopupHasOfferText,
} from "@/lib/welcome-popup-content";

describe("welcome popup content", () => {
  it("keeps emptied texts empty after saving (image-only popup)", () => {
    const saved = serializeWelcomePopupConfig({
      ...DEFAULT_WELCOME_POPUP,
      eyebrow: "",
      offerAmount: " ",
      offerSuffix: "",
      badgeText: "",
      emailTitle: "",
      emailDescription: "",
      primaryCta: "Registrarme",
    });
    const config = parseWelcomePopupConfig(saved);
    expect(config.eyebrow).toBe("");
    expect(config.offerAmount).toBe("");
    expect(config.emailDescription).toBe("");
    expect(config.primaryCta).toBe("Registrarme");
    expect(welcomePopupHasOfferText(config)).toBe(false);
  });

  it("gives buttons their original text back when emptied", () => {
    const config = parseWelcomePopupConfig(
      serializeWelcomePopupConfig({ ...DEFAULT_WELCOME_POPUP, secondaryCta: "", emailCta: "" }),
    );
    expect(config.secondaryCta).toBe(DEFAULT_WELCOME_POPUP.secondaryCta);
    expect(config.emailCta).toBe(DEFAULT_WELCOME_POPUP.emailCta);
  });

  it("fills texts that were never saved (older configs)", () => {
    const config = parseWelcomePopupConfig(JSON.stringify({ imageUrl: "/x.jpg" }));
    expect(config.eyebrow).toBe(DEFAULT_WELCOME_POPUP.eyebrow);
    expect(config.ctaSize).toBe("md");
  });

  it("keeps the button size", () => {
    const config = parseWelcomePopupConfig(
      serializeWelcomePopupConfig({ ...DEFAULT_WELCOME_POPUP, ctaSize: "sm" }),
    );
    expect(config.ctaSize).toBe("sm");
    expect(parseWelcomePopupConfig(JSON.stringify({ ctaSize: "xl" })).ctaSize).toBe("md");
  });
});
