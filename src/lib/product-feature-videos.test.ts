import { describe, expect, it } from "vitest";
import {
  featureVideoAspectRatio,
  parseProductFeatureVideos,
  serializeProductFeatureVideos,
  PRODUCT_FEATURE_VIDEOS_MAX,
  PRODUCT_FEATURE_VIDEO_FALLBACK_ASPECT,
} from "@/lib/product-feature-videos";

describe("parseProductFeatureVideos", () => {
  it("devuelve una lista vacía cuando no hay nada guardado", () => {
    expect(parseProductFeatureVideos(null)).toEqual([]);
    expect(parseProductFeatureVideos([])).toEqual([]);
    expect(parseProductFeatureVideos("no es json")).toEqual([]);
  });

  it("lee el array tanto si llega como objeto como si llega en texto", () => {
    const entry = { id: "a", title: "Anuncio", videoUrl: "https://x/v.mp4", aspectRatio: 0.5625 };
    const expected = [entry];
    expect(parseProductFeatureVideos([entry])).toEqual(expected);
    expect(parseProductFeatureVideos(JSON.stringify([entry]))).toEqual(expected);
  });

  it("descarta las entradas sin vídeo y recorta los títulos", () => {
    const parsed = parseProductFeatureVideos([
      { id: "a", title: "  Cómo se usa  ", videoUrl: " https://x/v.mp4 " },
      { id: "b", title: "Sin archivo", videoUrl: "   " },
      { id: "c", title: "Otro" },
    ]);

    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({ title: "Cómo se usa", videoUrl: "https://x/v.mp4" });
  });

  it("ignora proporciones imposibles y cae en la vertical por defecto", () => {
    const [video] = parseProductFeatureVideos([
      { id: "a", title: "T", videoUrl: "https://x/v.mp4", aspectRatio: 0 },
    ]);

    expect(video.aspectRatio).toBeNull();
    expect(featureVideoAspectRatio(video)).toBe(PRODUCT_FEATURE_VIDEO_FALLBACK_ASPECT);
  });

  it("no pasa del tope de vídeos por ficha", () => {
    const many = Array.from({ length: PRODUCT_FEATURE_VIDEOS_MAX + 3 }, (_, i) => ({
      id: `v${i}`,
      title: `Vídeo ${i}`,
      videoUrl: `https://x/v${i}.mp4`,
    }));

    expect(parseProductFeatureVideos(many)).toHaveLength(PRODUCT_FEATURE_VIDEOS_MAX);
    expect(serializeProductFeatureVideos(parseProductFeatureVideos(many))).toHaveLength(
      PRODUCT_FEATURE_VIDEOS_MAX,
    );
  });
});

describe("serializeProductFeatureVideos", () => {
  it("guarda solo los campos de la ficha y respeta el orden", () => {
    const serialized = serializeProductFeatureVideos([
      {
        id: "a",
        title: " Anuncio ",
        videoUrl: " https://x/a.mp4 ",
        aspectRatio: 0.5625,
        // @ts-expect-error: un campo de más no debe llegar a la base de datos.
        borrador: true,
      },
      { id: "b", title: "Ingredientes", videoUrl: "https://x/b.mp4", aspectRatio: null },
    ]);

    expect(serialized).toEqual([
      { id: "a", title: "Anuncio", videoUrl: "https://x/a.mp4", aspectRatio: 0.5625 },
      { id: "b", title: "Ingredientes", videoUrl: "https://x/b.mp4", aspectRatio: null },
    ]);
  });

  it("deja fuera las filas sin vídeo subido", () => {
    const serialized = serializeProductFeatureVideos([
      { id: "a", title: "Solo título", videoUrl: "", aspectRatio: null },
    ]);

    expect(serialized).toEqual([]);
  });
});
