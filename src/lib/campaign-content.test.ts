import { describe, expect, it } from "vitest";
import {
  campaignCtaPath,
  DEFAULT_CAMPAIGN,
  parseCampaignConfig,
  serializeCampaignConfig,
} from "@/lib/campaign-content";
import { siteCtaClass } from "@/lib/site-cta";

describe("campaign content", () => {
  it("links to a product by default and keeps old saved campaigns working", () => {
    const config = parseCampaignConfig(JSON.stringify({ ctaProductSlug: "elixir" }));
    expect(config.ctaTarget).toBe("link");
    expect(campaignCtaPath(config)).toBe("/elixir");
  });

  it("saves the newsletter destination and its texts", () => {
    const config = parseCampaignConfig(
      serializeCampaignConfig({
        ...DEFAULT_CAMPAIGN,
        ctaTarget: "newsletter",
        newsletterTitle: "Acceso anticipado",
        ctaSize: "lg",
      }),
    );
    expect(config.ctaTarget).toBe("newsletter");
    expect(config.newsletterTitle).toBe("Acceso anticipado");
    expect(config.ctaSize).toBe("lg");
  });
});

describe("site CTA sizes", () => {
  it("keeps the medium button as it always was and resizes the others", () => {
    expect(siteCtaClass("md")).toContain("px-6 py-3");
    expect(siteCtaClass("sm")).toContain("px-4 py-2");
    expect(siteCtaClass("sm")).not.toContain("px-6");
    expect(siteCtaClass("lg")).toContain("py-4");
  });
});
