import { describe, expect, it } from "vitest";
import { videoNeedsTranscode } from "@/lib/optimize-video-upload";

describe("videoNeedsTranscode", () => {
  it("sube un MP4 o WebM tal cual aunque pese o mida de más", () => {
    expect(
      videoNeedsTranscode({ crop: null, extension: "mp4", isRemoteUrl: false }),
    ).toBe(false);
    expect(
      videoNeedsTranscode({ crop: null, extension: "webm", isRemoteUrl: false }),
    ).toBe(false);
  });

  it("recodifica al recortar, al convertir un .mov o al reprocesar una URL", () => {
    expect(
      videoNeedsTranscode({
        crop: { x: 0, y: 0, width: 100, height: 100 },
        extension: "mp4",
        isRemoteUrl: false,
      }),
    ).toBe(true);
    expect(
      videoNeedsTranscode({ crop: null, extension: "mov", isRemoteUrl: false }),
    ).toBe(true);
    expect(
      videoNeedsTranscode({ crop: null, extension: null, isRemoteUrl: true }),
    ).toBe(true);
  });
});
