import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { CartProvider, useCart } from "@/context/CartContext";
import type { Product } from "@/data/products";

const CART_STORAGE_KEY = "shenna-brows-cart";

const ritual: Product = {
  id: "p-ritual",
  name: "RITUAL COMPLETO",
  slug: "ritual-shenna-brows",
  category: "PACK",
  price: 120,
  stock: 50,
  image_url: "/placeholder.svg",
  description: "",
  materials: "",
  shipping_info: "",
  tagline: "",
  stripe_price_id: "",
};

const gold = { id: "gold", name: "Gold Edition", hex: "#F0E138", group: "Herramientas" };
const black = { id: "black", name: "Black Edition", hex: "#0A0A0A", group: "Herramientas" };
const soft = { id: "soft", name: "Soft Brown", hex: "#736049", group: "Lápiz" };

const wrapper = ({ children }: { children: ReactNode }) => <CartProvider>{children}</CartProvider>;

/** Este jsdom no trae `localStorage`: basta uno en memoria. */
const memoryStorage = () => {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, String(value)),
    removeItem: (key: string) => void data.delete(key),
    clear: () => data.clear(),
  };
};

beforeEach(() => {
  vi.stubGlobal("localStorage", memoryStorage());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("carrito", () => {
  it("separa en líneas distintas cada combinación de variantes de un pack", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => result.current.addItem(ritual, [gold, soft]));
    act(() => result.current.addItem(ritual, [black, soft]));
    act(() => result.current.addItem(ritual, [gold, soft]));

    expect(
      result.current.items.map((i) => [i.colorVariants.map((v) => v.name).join(" + "), i.quantity]),
    ).toEqual([
      ["Gold Edition + Soft Brown", 2],
      ["Black Edition + Soft Brown", 1],
    ]);
  });

  it("recupera los carritos guardados con un solo color", () => {
    window.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify([
        {
          lineId: "p-lapiz::soft",
          product: { ...ritual, id: "p-lapiz", slug: "lapiz-de-precision" },
          colorVariant: { id: "soft", name: "Soft Brown", hex: "#736049" },
          quantity: 2,
        },
      ]),
    );

    const { result } = renderHook(() => useCart(), { wrapper });

    expect(result.current.items).toEqual([
      expect.objectContaining({
        lineId: "p-lapiz::soft",
        colorVariants: [{ id: "soft", name: "Soft Brown", hex: "#736049" }],
        quantity: 2,
      }),
    ]);
  });
});
