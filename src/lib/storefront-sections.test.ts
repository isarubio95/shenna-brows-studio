import { describe, expect, it } from "vitest";
import { layoutStorefrontBlocks } from "./storefront-sections";

describe("layoutStorefrontBlocks", () => {
  it("puts the trust strip on top of every shop page and the reviews at the end", () => {
    for (const path of ["/sobre-mi", "/preguntas-frecuentes", "/pinzas-gold-edition", "/elixir"]) {
      expect(layoutStorefrontBlocks(path)).toEqual({ top: ["trust"], bottom: ["reviews"] });
    }
  });

  it("keeps the brand values only on the shop page, besides the home", () => {
    expect(layoutStorefrontBlocks("/tienda")).toEqual({ top: ["trust"], bottom: ["values", "reviews"] });
    expect(layoutStorefrontBlocks("/tienda/")).toEqual({ top: ["trust"], bottom: ["values", "reviews"] });
  });

  it("leaves the home alone: it places the blocks itself", () => {
    expect(layoutStorefrontBlocks("/")).toEqual({ top: [], bottom: [] });
    expect(layoutStorefrontBlocks("")).toEqual({ top: [], bottom: [] });
  });

  it("keeps checkout, payment, account and admin pages clean", () => {
    for (const path of ["/checkout", "/payment-success", "/payment-ko", "/login", "/account", "/admin", "/admin/"]) {
      expect(layoutStorefrontBlocks(path)).toEqual({ top: [], bottom: [] });
    }
  });

  it("skips the reviews carousel on the full reviews page", () => {
    expect(layoutStorefrontBlocks("/testimonios")).toEqual({ top: ["trust"], bottom: [] });
  });

  it("does not mistake look-alike paths for excluded ones", () => {
    expect(layoutStorefrontBlocks("/accountancy-kit").top).toEqual(["trust"]);
  });
});
