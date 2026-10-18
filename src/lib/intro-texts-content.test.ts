import { describe, expect, it } from "vitest";
import {
  COLLECTION_INTRO_PROVISIONAL_SUBTITLE,
  DEFAULT_COLLECTION_INTRO,
  parseCollectionIntroConfig,
  serializeCollectionIntroConfig,
} from "./collection-intro-content";
import {
  DEFAULT_VALUE_PROPOSITION,
  parseValuePropositionConfig,
  serializeValuePropositionConfig,
} from "./value-proposition-content";

describe("collection-intro-content", () => {
  it("roundtrips the default texts", () => {
    expect(parseCollectionIntroConfig(serializeCollectionIntroConfig(DEFAULT_COLLECTION_INTRO))).toEqual(
      DEFAULT_COLLECTION_INTRO,
    );
  });

  it("never brings back the old professional-only headline", () => {
    const parsed = parseCollectionIntroConfig(null);
    expect(parsed.subtitle).toBe(COLLECTION_INTRO_PROVISIONAL_SUBTITLE);
    expect(parsed.subtitle).not.toMatch(/artista/i);
  });

  it("keeps a saved subtitle, allows clearing it and requires a title", () => {
    expect(parseCollectionIntroConfig(JSON.stringify({ title: " ", subtitle: "" }))).toEqual({
      title: DEFAULT_COLLECTION_INTRO.title,
      subtitle: "",
    });
    expect(parseCollectionIntroConfig(JSON.stringify({ title: "Tus imprescindibles", subtitle: " Para ti " })))
      .toEqual({ title: "Tus imprescindibles", subtitle: "Para ti" });
  });
});

describe("value-proposition-content", () => {
  it("roundtrips the default block", () => {
    expect(
      parseValuePropositionConfig(serializeValuePropositionConfig(DEFAULT_VALUE_PROPOSITION)),
    ).toEqual(DEFAULT_VALUE_PROPOSITION);
  });

  it("stays hidden until the client sends the final text", () => {
    expect(parseValuePropositionConfig(null).enabled).toBe(false);
    expect(parseValuePropositionConfig("{").enabled).toBe(false);
  });

  it("keeps saved edits and falls back to the provisional text when empty", () => {
    const parsed = parseValuePropositionConfig(JSON.stringify({ enabled: true, eyebrow: "", text: "  " }));
    expect(parsed).toEqual({ enabled: true, eyebrow: "", text: DEFAULT_VALUE_PROPOSITION.text });
  });
});
