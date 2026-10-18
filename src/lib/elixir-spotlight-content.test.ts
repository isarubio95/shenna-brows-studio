import { describe, expect, it } from "vitest";
import {
  DEFAULT_ELIXIR_SPOTLIGHT,
  ELIXIR_SPOTLIGHT_DEFAULT_MEDIA,
  ELIXIR_SPOTLIGHT_NO_VIDEO,
  parseElixirSpotlightConfig,
  pickDemoVideo,
  serializeElixirSpotlightConfig,
} from "./elixir-spotlight-content";

describe("elixir-spotlight-content", () => {
  it("roundtrips the default block", () => {
    expect(
      parseElixirSpotlightConfig(serializeElixirSpotlightConfig(DEFAULT_ELIXIR_SPOTLIGHT)),
    ).toEqual(DEFAULT_ELIXIR_SPOTLIGHT);
  });

  it("features Elixir with the client's five selling points by default", () => {
    const parsed = parseElixirSpotlightConfig(null);
    expect(parsed.productSlug).toBe("elixir");
    expect(parsed.benefits).toHaveLength(5);
    expect(parsed).toEqual(DEFAULT_ELIXIR_SPOTLIGHT);
    expect(parseElixirSpotlightConfig("{")).toEqual(DEFAULT_ELIXIR_SPOTLIGHT);
  });

  it("keeps saved edits and rejects invalid values field by field", () => {
    const parsed = parseElixirSpotlightConfig(
      JSON.stringify({
        enabled: false,
        productSlug: "Pack Black Edition",
        eyebrow: "",
        title: "  Black Edition ",
        benefits: ["Uno", " ", "Dos", "Tres", "Cuatro", "Cinco", "Seis"],
        ctaText: "  ",
        secondaryCtaText: "",
      }),
    );
    expect(parsed.enabled).toBe(false);
    expect(parsed.productSlug).toBe("elixir");
    expect(parsed.eyebrow).toBe("");
    expect(parsed.title).toBe("Black Edition");
    expect(parsed.benefits).toEqual(["Uno", "Dos", "Tres", "Cuatro", "Cinco"]);
    expect(parsed.ctaText).toBe(DEFAULT_ELIXIR_SPOTLIGHT.ctaText);
    expect(parsed.secondaryCtaText).toBe("");
  });

  it("shows the client's video unless another photo or video is saved", () => {
    // La fila guardada antes del 18/10 no tenía este campo.
    expect(parseElixirSpotlightConfig(JSON.stringify({ eyebrow: "Producto protagonista" })).mediaUrl).toBe(
      ELIXIR_SPOTLIGHT_DEFAULT_MEDIA,
    );
    expect(parseElixirSpotlightConfig(JSON.stringify({ mediaUrl: " https://cdn/foto.webp " })).mediaUrl).toBe(
      "https://cdn/foto.webp",
    );
    // Vacío a propósito: vuelve a los vídeos de la ficha del producto.
    expect(parseElixirSpotlightConfig(JSON.stringify({ mediaUrl: "" })).mediaUrl).toBe("");
  });

  it("accepts any valid product slug", () => {
    expect(
      parseElixirSpotlightConfig(JSON.stringify({ productSlug: "pack-black-edition" })).productSlug,
    ).toBe("pack-black-edition");
  });
});

describe("pickDemoVideo", () => {
  const videos = [
    { id: "anuncio", title: "¿Cansada de utilizar cuatro productos?" },
    { id: "uso", title: "Así se utiliza Elixir" },
  ];

  it("prefers the video chosen in the panel", () => {
    expect(pickDemoVideo(videos, "anuncio")?.id).toBe("anuncio");
  });

  it("falls back to the how-to video, then to the first one", () => {
    expect(pickDemoVideo(videos, "")?.id).toBe("uso");
    expect(pickDemoVideo(videos, "borrado")?.id).toBe("uso");
    expect(pickDemoVideo([{ id: "a", title: "Ingredientes" }], "")?.id).toBe("a");
  });

  it("shows the photo when asked or when there are no videos", () => {
    expect(pickDemoVideo(videos, ELIXIR_SPOTLIGHT_NO_VIDEO)).toBeNull();
    expect(pickDemoVideo([], "")).toBeNull();
  });
});
