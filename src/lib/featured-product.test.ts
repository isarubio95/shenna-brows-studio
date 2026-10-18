import { describe, expect, it } from "vitest";
import { featuredFirst } from "./featured-product";

const products = [{ slug: "lapiz" }, { slug: "mousse" }, { slug: "elixir" }, { slug: "stick" }];

describe("featuredFirst", () => {
  it("moves the featured product to the front and keeps the rest in order", () => {
    expect(featuredFirst(products, "elixir").map((p) => p.slug)).toEqual([
      "elixir",
      "lapiz",
      "mousse",
      "stick",
    ]);
  });

  it("returns the same list when the product is missing, already first or not set", () => {
    expect(featuredFirst(products, "no-existe")).toBe(products);
    expect(featuredFirst(products, "lapiz")).toBe(products);
    expect(featuredFirst(products, "")).toBe(products);
    expect(featuredFirst(products, null)).toBe(products);
  });

  it("does not mutate the original list", () => {
    featuredFirst(products, "stick");
    expect(products.map((p) => p.slug)).toEqual(["lapiz", "mousse", "elixir", "stick"]);
  });
});
