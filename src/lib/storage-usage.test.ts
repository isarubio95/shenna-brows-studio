import { describe, expect, it } from "vitest";
import { parseCampaignConfig, serializeCampaignConfig } from "./campaign-content";
import { parseHeroConfig, serializeHeroConfig } from "./hero-content";
import { serializeProductFeatureVideos } from "./product-feature-videos";
import { serializeProductImages } from "./product-images";
import { serializeIndexVideoConfig } from "./video-content";
import { parseWelcomePopupConfig, serializeWelcomePopupConfig } from "./welcome-popup-content";
import {
  collectUsedStorageRefs,
  parsePublicStorageRef,
  posterCompanionPath,
  storageObjectKey,
  usedStorageLabelsByKey,
} from "./storage-usage";

const BASE = "https://vanhsuisvxvclxdgutaw.supabase.co/storage/v1/object/public";

describe("parsePublicStorageRef", () => {
  it("extrae bucket y path de una URL pública, ignorando query y hash", () => {
    expect(
      parsePublicStorageRef(`${BASE}/product-images/pinzas-123.webp?v=2#top`),
    ).toEqual({ bucket: "product-images", path: "pinzas-123.webp" });
  });

  it("ignora rutas estáticas, vacías y URLs ajenas", () => {
    expect(parsePublicStorageRef("/hero/hero-lg.jpg")).toBeNull();
    expect(parsePublicStorageRef("/videos/cejas-tratamiento.mp4")).toBeNull();
    expect(parsePublicStorageRef("")).toBeNull();
    expect(parsePublicStorageRef(null)).toBeNull();
    expect(parsePublicStorageRef("https://cdn.example.com/foto.webp")).toBeNull();
  });
});

describe("collectUsedStorageRefs", () => {
  it("marca galería JSON, feature videos y el póster derivado del vídeo", () => {
    const refs = collectUsedStorageRefs({
      products: [
        {
          name: "Pinzas",
          image_url: serializeProductImages([
            `${BASE}/product-images/pinzas-1.mp4`,
            `${BASE}/product-images/pinzas-2.webp`,
          ]),
          feature_videos: serializeProductFeatureVideos([
            {
              id: "a",
              title: "Uso",
              videoUrl: `${BASE}/product-images/pinzas-video-9.mp4`,
              aspectRatio: 0.56,
            },
          ]),
        },
      ],
      siteContent: [],
    });

    const keys = refs.map((r) => storageObjectKey(r.bucket, r.path));
    expect(keys).toContain("product-images/pinzas-1.mp4");
    expect(keys).toContain("product-images/pinzas-1.poster.webp");
    expect(keys).toContain("product-images/pinzas-2.webp");
    expect(keys).toContain("product-images/pinzas-video-9.mp4");
    expect(keys).toContain("product-images/pinzas-video-9.poster.webp");

    const labels = usedStorageLabelsByKey(refs);
    expect(labels.get("product-images/pinzas-2.webp")).toEqual(["Producto: Pinzas"]);
    expect(labels.get("product-images/pinzas-1.poster.webp")?.[0]).toMatch(/Póster/);
  });

  it("recoge hero, campaña, popup y vídeo de inicio; ignora defaults locales", () => {
    const refs = collectUsedStorageRefs({
      products: [],
      siteContent: [
        {
          key: "index_hero",
          content: serializeHeroConfig({
            ...parseHeroConfig(null),
            desktopImageUrl: `${BASE}/campaign-images/hero-desktop-1.mp4`,
            mobileImageUrl: "/hero/hero-sm.jpg",
          }),
        },
        {
          key: "index_campaign",
          content: serializeCampaignConfig({
            ...parseCampaignConfig(null),
            desktopImageUrl: `${BASE}/campaign-images/campaign-desktop-2.webp`,
            mobileImageUrl: "",
          }),
        },
        {
          key: "index_welcome_popup",
          content: serializeWelcomePopupConfig({
            ...parseWelcomePopupConfig(null),
            imageUrl: `${BASE}/campaign-images/welcome-popup-3.webp`,
          }),
        },
        {
          key: "index_video",
          content: serializeIndexVideoConfig({
            title: "T",
            accent: "",
            videoUrl: `${BASE}/campaign-images/index-video-4.mp4`,
            posterUrl: `${BASE}/campaign-images/custom-poster.webp`,
          }),
        },
      ],
    });

    const keys = new Set(refs.map((r) => storageObjectKey(r.bucket, r.path)));
    expect(keys.has("campaign-images/hero-desktop-1.mp4")).toBe(true);
    expect(keys.has("campaign-images/hero-desktop-1.poster.webp")).toBe(true);
    expect(keys.has("campaign-images/campaign-desktop-2.webp")).toBe(true);
    expect(keys.has("campaign-images/welcome-popup-3.webp")).toBe(true);
    expect(keys.has("campaign-images/index-video-4.mp4")).toBe(true);
    expect(keys.has("campaign-images/index-video-4.poster.webp")).toBe(true);
    expect(keys.has("campaign-images/custom-poster.webp")).toBe(true);
    expect([...keys].some((k) => k.includes("hero-sm"))).toBe(false);
  });
});

describe("posterCompanionPath", () => {
  it("deriva el póster de un path de vídeo y no de una imagen", () => {
    expect(posterCompanionPath("hero-desktop-1.mp4")).toBe("hero-desktop-1.poster.webp");
    expect(posterCompanionPath("foto.webp")).toBeNull();
  });
});
