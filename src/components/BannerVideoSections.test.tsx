import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeAll, describe, expect, it } from "vitest";
import CampaignBanner from "./CampaignBanner";
import HeroSection from "./HeroSection";
import { parseCampaignConfig } from "@/lib/campaign-content";
import { parseHeroConfig } from "@/lib/hero-content";
import { rememberVideoAspectRatio } from "@/lib/video-aspect-ratio";

beforeAll(() => {
  class IntersectionObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  Object.defineProperty(globalThis, "IntersectionObserver", {
    writable: true,
    configurable: true,
    value: IntersectionObserverMock,
  });
});

describe("hero and campaign video backgrounds", () => {
  it("renders the campaign when the desktop asset is a video", () => {
    const config = parseCampaignConfig(
      JSON.stringify({
        desktopImageUrl: "https://cdn.example.com/campaign.mp4",
      }),
    );
    const { container } = render(
      <MemoryRouter>
        <CampaignBanner config={config} />
      </MemoryRouter>,
    );
    expect(container.querySelector("section")).not.toBeNull();
    expect(container.querySelector("video")).toHaveAttribute(
      "src",
      "https://cdn.example.com/campaign.mp4",
    );
  });

  it("hides the live campaign when there is no desktop media", () => {
    const { container } = render(
      <MemoryRouter>
        <CampaignBanner config={parseCampaignConfig(null)} />
      </MemoryRouter>,
    );
    expect(container.querySelector("section")).toBeNull();
  });

  it("renders the hero with a video background", () => {
    const config = parseHeroConfig(
      JSON.stringify({
        desktopImageUrl: "https://cdn.example.com/hero.mp4",
        mobileImageUrl: "https://cdn.example.com/hero-mobile.mp4",
      }),
    );
    const { container } = render(
      <MemoryRouter>
        <HeroSection config={config} />
      </MemoryRouter>,
    );
    const videos = container.querySelectorAll("video");
    expect(videos.length).toBeGreaterThan(0);
    expect([...videos].some((video) => video.getAttribute("src")?.endsWith("hero.mp4"))).toBe(
      true,
    );
  });

  it("ofrece el botón de sonido cuando el fondo es un vídeo", () => {
    const config = parseCampaignConfig(
      JSON.stringify({ desktopImageUrl: "https://cdn.example.com/campaign.mp4" }),
    );
    const { container } = render(
      <MemoryRouter>
        <CampaignBanner config={config} />
      </MemoryRouter>,
    );
    const button = container.querySelector('button[aria-pressed="false"]');
    expect(button).not.toBeNull();
    expect(button).toHaveAttribute("aria-label", "Activar el sonido del vídeo");
    expect(button?.className).not.toContain("hidden");
  });

  it("esconde el botón de sonido cuando el fondo es una imagen", () => {
    const config = parseCampaignConfig(
      JSON.stringify({ desktopImageUrl: "https://cdn.example.com/campaign.jpg" }),
    );
    const { container } = render(
      <MemoryRouter>
        <CampaignBanner config={config} />
      </MemoryRouter>,
    );
    const button = container.querySelector('button[aria-pressed="false"]');
    expect(button?.className ?? "hidden").toContain("hidden");
  });
});

describe("proporción del vídeo de fondo", () => {
  it("da a la campaña la proporción del archivo en vez de recortarlo", () => {
    const src = "https://cdn.example.com/campaign-vertical.mp4";
    // 1080x1920: más estrecho que el hueco 4:5 del móvil, que lo recortaría.
    rememberVideoAspectRatio(src, 1080, 1920);
    const config = parseCampaignConfig(JSON.stringify({ desktopImageUrl: src }));
    const { container } = render(
      <MemoryRouter>
        <CampaignBanner config={config} />
      </MemoryRouter>,
    );
    const mediaWrapper = container.querySelector("section")?.firstElementChild;
    expect(mediaWrapper).toHaveStyle({ aspectRatio: "0.5625" });
    expect(mediaWrapper?.className).not.toContain("aspect-4/5");
  });

  it("mantiene el hueco fijo mientras no se conoce la proporción", () => {
    const config = parseCampaignConfig(
      JSON.stringify({ desktopImageUrl: "https://cdn.example.com/sin-medir.mp4" }),
    );
    const { container } = render(
      <MemoryRouter>
        <CampaignBanner config={config} />
      </MemoryRouter>,
    );
    expect(container.querySelector("section")?.firstElementChild?.className).toContain(
      "aspect-4/5",
    );
  });

  it("no toca el hueco de las fotos", () => {
    const config = parseCampaignConfig(
      JSON.stringify({ desktopImageUrl: "https://cdn.example.com/campaign.jpg" }),
    );
    const { container } = render(
      <MemoryRouter>
        <CampaignBanner config={config} />
      </MemoryRouter>,
    );
    expect(container.querySelector("section")?.firstElementChild?.className).toContain(
      "aspect-4/5",
    );
  });
});
