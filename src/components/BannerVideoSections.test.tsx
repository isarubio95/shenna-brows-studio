import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeAll, describe, expect, it } from "vitest";
import CampaignBanner from "./CampaignBanner";
import HeroSection from "./HeroSection";
import { parseCampaignConfig } from "@/lib/campaign-content";
import { parseHeroConfig } from "@/lib/hero-content";

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
});
