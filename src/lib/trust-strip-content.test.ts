import { describe, expect, it } from "vitest";
import {
  DEFAULT_TRUST_STRIP,
  parseTrustStripConfig,
  serializeTrustStripConfig,
} from "./trust-strip-content";

describe("trust-strip-content", () => {
  it("roundtrips the default strip", () => {
    expect(parseTrustStripConfig(serializeTrustStripConfig(DEFAULT_TRUST_STRIP))).toEqual(
      DEFAULT_TRUST_STRIP,
    );
  });

  it("falls back to the client's four advantages when there is nothing saved", () => {
    for (const raw of [null, "", "{", "texto suelto"]) {
      const parsed = parseTrustStripConfig(raw);
      expect(parsed).toEqual(DEFAULT_TRUST_STRIP);
      expect(parsed.items.map((item) => item.title)).toEqual([
        "Envío gratis",
        "Entrega en 2–3 días",
        "Pago seguro",
        "Te acompañamos",
      ]);
    }
  });

  it("does not share item objects with the defaults", () => {
    const parsed = parseTrustStripConfig(null);
    parsed.items[0].title = "Cambiado";
    expect(DEFAULT_TRUST_STRIP.items[0].title).toBe("Envío gratis");
  });

  it("keeps saved edits, drops items without title and caps the list at four", () => {
    const parsed = parseTrustStripConfig(
      JSON.stringify({
        enabled: false,
        compactHeading: "  ",
        items: [
          { icon: "gift", title: " Regalo ", subtitle: "En tu primer pedido", compactTitle: "" },
          { icon: "no-existe", title: "Pago seguro" },
          { title: "   " },
          { title: "Tres" },
          { title: "Cuatro" },
          { title: "Cinco" },
        ],
      }),
    );
    expect(parsed.enabled).toBe(false);
    expect(parsed.compactHeading).toBe(DEFAULT_TRUST_STRIP.compactHeading);
    expect(parsed.items.map((item) => item.title)).toEqual(["Regalo", "Pago seguro", "Tres"]);
    expect(parsed.items[0]).toMatchObject({ icon: "gift", subtitle: "En tu primer pedido" });
    // Icono desconocido: el de la ventaja que ocupaba ese hueco por defecto.
    expect(parsed.items[1].icon).toBe(DEFAULT_TRUST_STRIP.items[1].icon);
  });
});
