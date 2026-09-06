import { describe, expect, it } from "vitest";
import {
  DEFAULT_ANNOUNCEMENT_BAR,
  DEFAULT_ANNOUNCEMENT_ITEMS,
  announcementItemsToText,
  announcementTextToItems,
  parseAnnouncementBarConfig,
  serializeAnnouncementBarConfig,
} from "./announcement-content";

describe("announcement-content", () => {
  it("roundtrips the default announcement bar", () => {
    const parsed = parseAnnouncementBarConfig(
      serializeAnnouncementBarConfig(DEFAULT_ANNOUNCEMENT_BAR),
    );
    expect(parsed.enabled).toBe(true);
    expect(parsed.items).toEqual(DEFAULT_ANNOUNCEMENT_ITEMS);
    expect(parsed.background).toBe("#000000");
    expect(parsed.textColor).toBe("#FFFFFF");
  });

  it("falls back to defaults when the payload is empty or invalid JSON", () => {
    expect(parseAnnouncementBarConfig(null).items).toEqual(DEFAULT_ANNOUNCEMENT_ITEMS);
    expect(parseAnnouncementBarConfig("").items).toEqual(DEFAULT_ANNOUNCEMENT_ITEMS);
    expect(parseAnnouncementBarConfig("{").items).toEqual(DEFAULT_ANNOUNCEMENT_ITEMS);
    expect(parseAnnouncementBarConfig("{").enabled).toBe(true);
  });

  it("accepts a plain text payload as a single message", () => {
    const parsed = parseAnnouncementBarConfig("Envío gratis este fin de semana");
    expect(parsed.items).toEqual(["Envío gratis este fin de semana"]);
    expect(parsed.background).toBe("#000000");
  });

  it("parses several messages from line breaks", () => {
    expect(announcementTextToItems("Uno\n\nDos\n")).toEqual(["Uno", "Dos"]);
    expect(announcementItemsToText(["Uno", "Dos"])).toBe("Uno\nDos");
  });

  it("keeps custom colors and the enabled flag", () => {
    const parsed = parseAnnouncementBarConfig(
      JSON.stringify({
        enabled: false,
        items: ["Novedades"],
        background: "#111111",
        textColor: "#F8F3EB",
      }),
    );
    expect(parsed.enabled).toBe(false);
    expect(parsed.items).toEqual(["Novedades"]);
    expect(parsed.background).toBe("#111111");
    expect(parsed.textColor).toBe("#F8F3EB");
  });
});
