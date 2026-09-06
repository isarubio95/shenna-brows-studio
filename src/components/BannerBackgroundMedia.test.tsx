import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import BannerBackgroundMedia from "./BannerBackgroundMedia";

describe("BannerBackgroundMedia", () => {
  it("renders a picture for photo URLs", () => {
    const { container } = render(
      <BannerBackgroundMedia
        desktopSrc="/hero/hero-lg.jpg"
        mobileSrc="/hero/hero-sm.jpg"
        alt="Hero"
      />,
    );
    expect(container.querySelector("img")).toHaveAttribute("src", "/hero/hero-lg.jpg");
    expect(container.querySelector("source")).toHaveAttribute("srcSet", "/hero/hero-sm.jpg");
    expect(container.querySelector("video")).toBeNull();
  });

  it("renders looping videos when both URLs are videos", () => {
    const { container } = render(
      <BannerBackgroundMedia
        desktopSrc="https://cdn.example.com/hero.mp4"
        mobileSrc="https://cdn.example.com/hero-mobile.webm"
        alt="Hero"
      />,
    );
    const videos = container.querySelectorAll("video");
    expect(videos).toHaveLength(2);
    expect(videos[0]).toHaveAttribute("src", "https://cdn.example.com/hero-mobile.webm");
    expect(videos[1]).toHaveAttribute("src", "https://cdn.example.com/hero.mp4");
    expect(videos[0]).toHaveAttribute("autoplay");
    expect(videos[0]).toHaveAttribute("loop");
    expect(container.querySelector("img")).toBeNull();
  });

  it("can mix a desktop photo with a mobile video", () => {
    const { container } = render(
      <BannerBackgroundMedia
        desktopSrc="/hero/hero-lg.jpg"
        mobileSrc="https://cdn.example.com/hero-mobile.mp4"
        alt="Hero"
      />,
    );
    expect(container.querySelector("video")).toHaveAttribute(
      "src",
      "https://cdn.example.com/hero-mobile.mp4",
    );
    expect(container.querySelector("img")).toHaveAttribute("src", "/hero/hero-lg.jpg");
  });
});
