import { describe, expect, it } from "vitest";
import { parseCampaignConfig, serializeCampaignConfig } from "./campaign-content";
import { parseHeroConfig, serializeHeroConfig } from "./hero-content";
import {
  isBannerMediaFile,
  isVideoFile,
  isVideoMediaUrl,
  videoFileExtension,
} from "./media-url";

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
