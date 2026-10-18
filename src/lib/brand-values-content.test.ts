import { describe, expect, it } from "vitest";
import {
  DEFAULT_BRAND_VALUES,
  parseBrandValuesConfig,
  serializeBrandValuesConfig,
} from "./brand-values-content";

describe("brand-values-content", () => {
  it("roundtrips the default block", () => {
    expect(parseBrandValuesConfig(serializeBrandValuesConfig(DEFAULT_BRAND_VALUES))).toEqual(
      DEFAULT_BRAND_VALUES,
    );
  });

  it("falls back to the four values of the client's mockup", () => {
    const parsed = parseBrandValuesConfig(null);
    expect(parsed.title).toBe("La esencia que define Shenna BROWS");
    expect(parsed.cards.map((card) => card.title)).toEqual([
      "Precisión en cada detalle",
      "Tu belleza, a tu manera",
      "Cuidado que acompaña",
      "El valor de los detalles",
    ]);
    expect(parseBrandValuesConfig("no es json")).toEqual(DEFAULT_BRAND_VALUES);
  });

  it("keeps saved edits, allows empty optional texts and drops untitled cards", () => {
    const parsed = parseBrandValuesConfig(
      JSON.stringify({
        enabled: false,
        eyebrow: "",
        title: "   ",
        titleAccent: "",
        keywords: "",
        cards: [
          { icon: "gem", title: "Joyas", text: " Hechas a mano ", imageUrl: "https://cdn/x.webp" },
          { title: "" },
          { icon: "raro", title: "Sin foto", imageUrl: "" },
        ],
      }),
    );
    expect(parsed).toMatchObject({ enabled: false, eyebrow: "", titleAccent: "", keywords: "" });
    expect(parsed.title).toBe(DEFAULT_BRAND_VALUES.title);
    expect(parsed.cards).toHaveLength(2);
    expect(parsed.cards[0]).toMatchObject({ icon: "gem", text: "Hechas a mano", imageUrl: "https://cdn/x.webp" });
    expect(parsed.cards[1]).toMatchObject({ title: "Sin foto", imageUrl: "" });
    expect(parsed.cards[1].icon).toBe(DEFAULT_BRAND_VALUES.cards[2].icon);
  });
});
