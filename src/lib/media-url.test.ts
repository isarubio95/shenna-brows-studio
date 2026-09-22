import { describe, expect, it } from "vitest";
import { parseCampaignConfig, serializeCampaignConfig } from "./campaign-content";
import { parseHeroConfig, serializeHeroConfig } from "./hero-content";
import {
  isBannerMediaFile,
  isVideoFile,
  isVideoMediaUrl,
  posterPathForVideoPath,
  posterUrlForVideoUrl,
  videoFileExtension,
} from "./media-url";
import { getProductPosterUrl, serializeProductImages } from "./product-images";

describe("isVideoMediaUrl", () => {
  it("detects common video extensions in absolute and relative URLs", () => {
    expect(isVideoMediaUrl("/videos/hero.mp4")).toBe(true);
    expect(isVideoMediaUrl("https://cdn.example.com/campaign/banner.webm")).toBe(true);
    expect(
      isVideoMediaUrl(
        "https://vanhsuisvxvclxdgutaw.supabase.co/storage/v1/object/public/campaign-images/hero-desktop-1.mov?v=2",
      ),
    ).toBe(true);
    expect(isVideoMediaUrl("/hero/clip.m4v")).toBe(true);
  });

  it("rejects images and empty values", () => {
    expect(isVideoMediaUrl("")).toBe(false);
    expect(isVideoMediaUrl(null)).toBe(false);
    expect(isVideoMediaUrl("/hero/hero-lg.jpg")).toBe(false);
    expect(isVideoMediaUrl("https://cdn.example.com/banner.webp")).toBe(false);
    expect(isVideoMediaUrl("https://cdn.example.com/photo.mp4.jpg")).toBe(false);
  });
});

describe("video file helpers", () => {
  it("accepts video files by type or extension", () => {
    expect(isVideoFile(new File([], "clip.mp4", { type: "video/mp4" }))).toBe(true);
    expect(isVideoFile(new File([], "clip.MOV", { type: "" }))).toBe(true);
    expect(isVideoFile(new File([], "foto.jpg", { type: "image/jpeg" }))).toBe(false);
    expect(isBannerMediaFile(new File([], "foto.webp", { type: "image/webp" }))).toBe(true);
  });

  it("resolves the upload extension from name or mime", () => {
    expect(videoFileExtension(new File([], "a.webm", { type: "video/webm" }))).toBe("webm");
    expect(videoFileExtension(new File([], "a.mov", { type: "video/quicktime" }))).toBe("mov");
    expect(videoFileExtension(new File([], "a.bin", { type: "video/mp4" }))).toBe("mp4");
  });
});

describe("hero and campaign configs keep video URLs", () => {
  it("roundtrips a hero with desktop and mobile videos", () => {
    const parsed = parseHeroConfig(
      serializeHeroConfig({
        ...parseHeroConfig(null),
        desktopImageUrl: "https://cdn.example.com/hero-desktop.mp4",
        mobileImageUrl: "https://cdn.example.com/hero-mobile.webm",
      }),
    );
    expect(parsed.desktopImageUrl).toBe("https://cdn.example.com/hero-desktop.mp4");
    expect(parsed.mobileImageUrl).toBe("https://cdn.example.com/hero-mobile.webm");
  });

  it("roundtrips a campaign with a video background", () => {
    const parsed = parseCampaignConfig(
      serializeCampaignConfig({
        ...parseCampaignConfig(null),
        desktopImageUrl: "https://cdn.example.com/campaign.mp4",
        mobileImageUrl: "",
      }),
    );
    expect(parsed.desktopImageUrl).toBe("https://cdn.example.com/campaign.mp4");
    expect(isVideoMediaUrl(parsed.desktopImageUrl)).toBe(true);
  });
});

describe("póster derivado del vídeo", () => {
  it("cambia la extensión del archivo subido", () => {
    expect(posterPathForVideoPath("hero-desktop-123.mp4")).toBe("hero-desktop-123.poster.webp");
    expect(posterPathForVideoPath("index-video-9.webm")).toBe("index-video-9.poster.webp");
  });

  it("deriva la URL del póster conservando query y hash", () => {
    expect(posterUrlForVideoUrl("https://cdn.example.com/hero.mp4")).toBe(
      "https://cdn.example.com/hero.poster.webp",
    );
    expect(posterUrlForVideoUrl("https://cdn.example.com/hero.mov?v=3")).toBe(
      "https://cdn.example.com/hero.poster.webp?v=3",
    );
  });

  it("no devuelve póster para imágenes ni valores vacíos", () => {
    expect(posterUrlForVideoUrl("https://cdn.example.com/hero.webp")).toBeUndefined();
    expect(posterUrlForVideoUrl("")).toBeUndefined();
    expect(posterUrlForVideoUrl(null)).toBeUndefined();
  });
});

describe("galería de producto con vídeo", () => {
  it("usa el póster cuando el elemento principal es un vídeo", () => {
    const stored = serializeProductImages([
      "https://cdn.example.com/espuma-1.mp4",
      "https://cdn.example.com/espuma-2.webp",
    ]);
    expect(getProductPosterUrl(stored, "espuma")).toBe(
      "https://cdn.example.com/espuma-1.poster.webp",
    );
  });

  it("devuelve la imagen tal cual cuando la principal es una foto", () => {
    const stored = serializeProductImages(["https://cdn.example.com/espuma-1.webp"]);
    expect(getProductPosterUrl(stored, "espuma")).toBe("https://cdn.example.com/espuma-1.webp");
  });
});
