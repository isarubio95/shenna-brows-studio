import { describe, expect, it } from "vitest";
import { applyTheme, DEFAULT_THEME, hexToHslComponents } from "@/hooks/use-theme-config";

describe("hexToHslComponents", () => {
  it("converts black hex to HSL components", () => {
    expect(hexToHslComponents("#1A1A1A")).toBe("0 0% 10%");
  });

  it("accepts 8-digit hex with alpha", () => {
    expect(hexToHslComponents("#C5A059FF")).toBe(hexToHslComponents("#C5A059"));
  });

  it("returns fallback for invalid values", () => {
    expect(hexToHslComponents("not-a-color", "40 48% 55%")).toBe("40 48% 55%");
  });
});

describe("applyTheme", () => {
  it("writes typography CSS variables on the document root", () => {
    applyTheme({
      ...DEFAULT_THEME,
      colorH3: "#FA9DE2",
      colorParagraph: "#FA9DE2FF",
      colorAccent: "#C5A059",
    });

    const root = document.documentElement.style;
    expect(root.getPropertyValue("--theme-color-h3")).toBe("#FA9DE2");
    expect(root.getPropertyValue("--theme-color-paragraph")).toBe("#FA9DE2FF");
    expect(root.getPropertyValue("--theme-color-accent")).toBe("#C5A059");
    expect(root.getPropertyValue("--theme-primary-hsl")).toBe(hexToHslComponents("#C5A059"));
  });
});
