import { describe, expect, it } from "vitest";
import { planVideoTranscode, videoNeedsTranscode } from "@/lib/optimize-video-upload";

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

describe("planVideoTranscode", () => {
  it("copia un H.264 que ya cabe, sin volver a codificar la imagen", () => {
    expect(
      planVideoTranscode({ crop: null, displayWidth: 720, displayHeight: 1280, codec: "avc" }),
    ).toEqual({ reencode: false });
  });

  it("vuelve a codificar al recortar, al convertir HEVC o al pasar de 4K", () => {
    const cropped = planVideoTranscode({
      crop: { x: 10, y: 20, width: 500, height: 501 },
      displayWidth: 720,
      displayHeight: 1280,
      codec: "avc",
    });
    expect(cropped.reencode).toBe(true);
    expect(cropped.crop).toEqual({ left: 10, top: 20, width: 500, height: 501 });
    expect(cropped.width! % 2).toBe(0);
    expect(cropped.height! % 2).toBe(0);

    expect(
      planVideoTranscode({ crop: null, displayWidth: 1280, displayHeight: 720, codec: "hevc" })
        .reencode,
    ).toBe(true);

    const huge = planVideoTranscode({
      crop: null,
      displayWidth: 7680,
      displayHeight: 4320,
      codec: "avc",
    });
    expect(huge.reencode).toBe(true);
    expect(huge.width).toBeLessThanOrEqual(3840);
    expect(huge.height).toBeLessThanOrEqual(3840);
  });
});
