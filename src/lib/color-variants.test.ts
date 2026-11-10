import { describe, expect, it } from "vitest";
import { cartLineId, groupColorVariants, parseColorVariants } from "@/lib/color-variants";
import {
  groupColorVariants as groupOnServer,
  parseColorVariantsFromDb,
  requestedVariantIds,
  resolveVariantChoice,
} from "../../supabase/functions/_shared/colorVariants";

/** Como el pack Ritual completo: dos tonos de lápiz y dos ediciones de herramientas. */
const ritual = [
  { id: "black", name: "Black Edition", hex: "#0A0A0A", group: "Herramientas" },
  { id: "gold", name: "Gold Edition", hex: "#F0E138", group: "herramientas " },
  { id: "soft", name: "Soft Brown", hex: "#736049", group: "Lápiz" },
  { id: "medium", name: "Medium Brown", hex: "#54483D", group: "lapiz" },
];

const pencil = [
  { id: "soft", name: "Soft Brown", hex: "#736049" },
  { id: "medium", name: "Medium Brown", hex: "#54483D" },
];

describe("variantes de color", () => {
  it("lee el grupo y agrupa sin distinguir mayúsculas, espacios ni tildes", () => {
    const groups = groupColorVariants(parseColorVariants(ritual));

    expect(groups.map((g) => g.name)).toEqual(["Herramientas", "Lápiz"]);
    expect(groups.map((g) => g.variants.map((v) => v.id))).toEqual([
      ["black", "gold"],
      ["soft", "medium"],
    ]);
  });

  it("sin grupos, todas las variantes son un único grupo sin nombre", () => {
    const groups = groupColorVariants(parseColorVariants(pencil));

    expect(groups).toHaveLength(1);
    expect(groups[0].name).toBe("");
    expect(parseColorVariants(pencil)[0]).not.toHaveProperty("group");
  });

  it("agrupa igual en la tienda y en el pago", () => {
    for (const variants of [ritual, pencil]) {
      const shop = groupColorVariants(parseColorVariants(variants));
      const server = groupOnServer(parseColorVariantsFromDb(variants));
      expect(server).toEqual(shop);
    }
  });

  it("da una línea del carrito por combinación de variantes", () => {
    expect(cartLineId("p1", [])).toBe("p1::default");
    expect(cartLineId("p1", ["soft"])).toBe("p1::soft");
    expect(cartLineId("p1", ["gold", "soft"])).not.toBe(cartLineId("p1", ["black", "soft"]));
  });
});

describe("elección de variantes al pagar", () => {
  const variants = parseColorVariantsFromDb(ritual);

  it("acepta una variante de cada grupo y las devuelve en el orden de los grupos", () => {
    const choice = resolveVariantChoice("RITUAL COMPLETO", variants, ["soft", "gold"]);

    expect(choice).toEqual({
      ok: true,
      chosen: [
        expect.objectContaining({ id: "gold", name: "Gold Edition" }),
        expect.objectContaining({ id: "soft", name: "Soft Brown" }),
      ],
    });
  });

  it("pide la elección que falta", () => {
    expect(resolveVariantChoice("RITUAL COMPLETO", variants, ["soft"])).toEqual({
      ok: false,
      error: "Debes elegir una opción de «Herramientas» para: RITUAL COMPLETO",
    });
    expect(resolveVariantChoice("LÁPIZ", parseColorVariantsFromDb(pencil), [])).toEqual({
      ok: false,
      error: "Debes elegir un color para: LÁPIZ",
    });
  });

  it("rechaza dos variantes del mismo grupo, ids repetidos o desconocidos", () => {
    for (const ids of [["soft", "medium", "gold"], ["soft", "soft", "gold"], ["soft", "silver"]]) {
      expect(resolveVariantChoice("RITUAL COMPLETO", variants, ids)).toEqual({
        ok: false,
        error: "Color de producto no válido",
      });
    }
  });

  it("no pide nada a un producto sin variantes", () => {
    expect(resolveVariantChoice("ELIXIR", [], ["cualquiera"])).toEqual({ ok: true, chosen: [] });
  });

  it("lee la lista de ids y, en carritos antiguos, el id suelto", () => {
    expect(requestedVariantIds({ colorVariantIds: ["soft", " gold ", ""] })).toEqual(["soft", "gold"]);
    expect(requestedVariantIds({ colorVariantId: "soft" })).toEqual(["soft"]);
    expect(requestedVariantIds({})).toEqual([]);
  });
});
