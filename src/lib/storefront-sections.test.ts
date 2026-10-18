import { describe, expect, it } from "vitest";
import { layoutStorefrontBlocks } from "./storefront-sections";

describe("layoutStorefrontBlocks", () => {
  it("adds every shared block to the shop pages, in the client's order", () => {
    for (const path of ["/tienda", "/sobre-mi", "/preguntas-frecuentes", "/pinzas-gold-edition"]) {
      expect(layoutStorefrontBlocks(path, { spotlightSlug: "elixir" })).toEqual([
        "trust",
        "values",
        "spotlight",
        "reviews",
      ]);
    }
  });

  it("leaves the home alone: it places the blocks itself", () => {
    expect(layoutStorefrontBlocks("/")).toEqual([]);
    expect(layoutStorefrontBlocks("")).toEqual([]);
  });

  it("keeps checkout, payment, account and admin pages clean", () => {
    for (const path of [
      "/checkout",
      "/payment-success",
      "/payment-ko",
      "/login",
      "/account",
      "/admin",
      "/admin/",
    ]) {
      expect(layoutStorefrontBlocks(path)).toEqual([]);
    }
  });

  it("does not repeat the featured product on its own page", () => {
    expect(layoutStorefrontBlocks("/elixir", { spotlightSlug: "elixir" })).toEqual([
      "trust",
      "values",
      "reviews",
    ]);
    expect(layoutStorefrontBlocks("/elixir/", { spotlightSlug: "elixir" })).not.toContain("spotlight");
  });

  it("skips the reviews carousel on the full reviews page", () => {
    expect(layoutStorefrontBlocks("/testimonios")).toEqual(["trust", "values", "spotlight"]);
  });

  it("does not mistake look-alike paths for excluded ones", () => {
    expect(layoutStorefrontBlocks("/accountancy-kit")).toContain("trust");
  });
});
