import { describe, expect, it } from "vitest";
import {
  parseProductClaims,
  productClaimLines,
  productClaimsHeading,
  serializeProductClaims,
} from "./product-claims";

const ELIXIR_CLAIMS = [
  "Fijación con acabado natural. Mantén tus cejas definidas y en su sitio.",
  "Sin residuos blancos visibles. Un acabado limpio y discreto.",
  "Fijación y cuidado en una misma fórmula. Combina polímeros fijadores con activos cosméticos.",
].join("\n");

describe("product-claims", () => {
  it("bolds the first sentence of each line, like the client's example", () => {
    expect(parseProductClaims(ELIXIR_CLAIMS)[0]).toEqual({
      lead: "Fijación con acabado natural.",
      text: "Mantén tus cejas definidas y en su sitio.",
    });
  });

  it("keeps a line without a full stop as a bold claim on its own", () => {
    expect(parseProductClaims("Cejas y pestañas en un solo gesto")).toEqual([
      { lead: "Cejas y pestañas en un solo gesto", text: "" },
    ]);
  });

  it("does not split on decimals or abbreviations without a following space", () => {
    expect(parseProductClaims("Formato de 4.5 ml. Dura meses.")[0]).toEqual({
      lead: "Formato de 4.5 ml.",
      text: "Dura meses.",
    });
  });

  it("ignores blank lines and keeps at most five claims", () => {
    const raw = "uno\n\n  dos  \ntres\ncuatro\ncinco\nseis";
    expect(productClaimLines(raw)).toEqual(["uno", "dos", "tres", "cuatro", "cinco"]);
    expect(parseProductClaims(null)).toEqual([]);
  });

  it("serializes the five editor lines, or null when they are empty", () => {
    expect(serializeProductClaims(["  Uno.  Texto ", "", "Dos"])).toBe("Uno. Texto\nDos");
    expect(serializeProductClaims(["", "  "])).toBeNull();
  });

  it("builds the heading from the product's short name", () => {
    expect(productClaimsHeading(" ELIXIR ")).toBe("¿Por qué elegir ELIXIR?");
  });
});
