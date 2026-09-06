import { describe, expect, it } from "vitest";
import {
  DEFAULT_FAQ,
  isPendingFaqAnswer,
  moveArrayItem,
  parseFaqAnswerParts,
  parseFaqConfig,
  serializeFaqConfig,
} from "./faq-content";

describe("faq-content", () => {
  it("roundtrips the default FAQ", () => {
    const parsed = parseFaqConfig(serializeFaqConfig(DEFAULT_FAQ));
    expect(parsed.title).toBe(DEFAULT_FAQ.title);
    expect(parsed.pageVisible).toBe(false);
    expect(parsed.sections).toHaveLength(DEFAULT_FAQ.sections.length);
    expect(parsed.sections[0].items[0].question).toBe(DEFAULT_FAQ.sections[0].items[0].question);
  });

  it("keeps the public page hidden unless pageVisible is explicitly true", () => {
    const withoutFlag = parseFaqConfig(
      JSON.stringify({
        title: "Preguntas frecuentes",
        sections: DEFAULT_FAQ.sections.slice(0, 1),
      }),
    );
    expect(withoutFlag.pageVisible).toBe(false);

    const visible = parseFaqConfig(serializeFaqConfig({ ...DEFAULT_FAQ, pageVisible: true }));
    expect(visible.pageVisible).toBe(true);
  });

  it("falls back to defaults when the payload is invalid", () => {
    expect(parseFaqConfig("not-json").title).toBe(DEFAULT_FAQ.title);
    expect(parseFaqConfig("{").title).toBe(DEFAULT_FAQ.title);
  });

  it("detects pending answers", () => {
    expect(isPendingFaqAnswer("")).toBe(true);
    expect(isPendingFaqAnswer("Respuesta a completar: texto")).toBe(true);
    expect(isPendingFaqAnswer("Aceptamos tarjeta y Bizum.")).toBe(false);
  });

  it("moves items without mutating the original array", () => {
    const source = ["a", "b", "c"];
    expect(moveArrayItem(source, 0, 1)).toEqual(["b", "a", "c"]);
    expect(source).toEqual(["a", "b", "c"]);
  });

  it("parses safe markdown links in answers", () => {
    const parts = parseFaqAnswerParts("Lee la [política](/politica-devoluciones) y [email](mailto:info@shennabrows.com).");
    expect(parts).toEqual([
      { type: "text", value: "Lee la " },
      { type: "link", href: "/politica-devoluciones", label: "política" },
      { type: "text", value: " y " },
      { type: "link", href: "mailto:info@shennabrows.com", label: "email" },
      { type: "text", value: "." },
    ]);
  });
});
