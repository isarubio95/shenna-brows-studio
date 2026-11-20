import { describe, expect, it } from "vitest";
import { buildNewsletterBatches, nextUnsentEmails } from "./newsletter-batches";

const make = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    email: `p${i + 1}@x.com`,
    created_at: new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString(),
  }));

describe("buildNewsletterBatches", () => {
  it("splits into batches of 100 by sign-up order", () => {
    const batches = buildNewsletterBatches(make(250).reverse());
    expect(batches.map((b) => [b.from, b.to, b.emails.length])).toEqual([
      [1, 100, 100],
      [101, 200, 100],
      [201, 250, 50],
    ]);
    expect(batches[0].emails[0]).toBe("p1@x.com");
    expect(batches[2].emails.at(-1)).toBe("p250@x.com");
  });

  it("returns no batches for an empty list", () => {
    expect(buildNewsletterBatches([])).toEqual([]);
  });
});

describe("nextUnsentEmails", () => {
  it("skips the ones already sent", () => {
    const subs = make(5);
    const next = nextUnsentEmails(subs, new Set(["p1@x.com", "p3@x.com"]), 2);
    expect(next).toEqual(["p2@x.com", "p4@x.com"]);
  });
});
