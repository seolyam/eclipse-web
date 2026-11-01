import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { compressScreenshot } = await import("./compress");

const capture = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: "#403020", noise: { type: "gaussian", mean: 120, sigma: 24 } } });

const compress = async (input: Buffer) => {
  const result = await compressScreenshot(input);
  if (!result) throw new Error("expected a compressed screenshot");
  return result;
};

describe("a stored screenshot", () => {
  it("is AVIF, far smaller than the capture it came from", async () => {
    const input = await capture(1920, 1080).png().toBuffer();
    const { full, thumb } = await compress(input);
    expect((await sharp(full).metadata()).format).toBe("heif");
    expect((await sharp(thumb).metadata()).format).toBe("heif");
    expect(full.length).toBeLessThan(input.length / 2);
    expect(thumb.length).toBeLessThan(full.length);
  });

  it("is sized to what the site can show", async () => {
    const { full, thumb } = await compress(await capture(3840, 2160).png().toBuffer());
    expect(await sharp(full).metadata()).toMatchObject({ width: 1600, height: 900 });
    expect(await sharp(thumb).metadata()).toMatchObject({ width: 960, height: 540 });
  });

  it("limits a tall capture by its long edge", async () => {
    const { full } = await compress(await capture(1000, 3000).png().toBuffer());
    expect((await sharp(full).metadata()).height).toBe(1600);
  });

  it("is never enlarged", async () => {
    const { full, thumb } = await compress(await capture(320, 180).png().toBuffer());
    expect((await sharp(full).metadata()).width).toBe(320);
    expect((await sharp(thumb).metadata()).width).toBe(320);
  });

  // A phone's photo can carry the GPS position it was taken at.
  it("drops what the file says about where and how it was taken", async () => {
    const input = await capture(400, 200).jpeg().withExif({ IFD0: { Copyright: "private", Software: "a camera" } }).toBuffer();
    expect((await sharp(input).metadata()).exif).toBeDefined();
    const { full, thumb } = await compress(input);
    expect((await sharp(full).metadata()).exif).toBeUndefined();
    expect((await sharp(thumb).metadata()).exif).toBeUndefined();
  });

  it("is turned the right way up before that note is dropped", async () => {
    const input = await capture(400, 200).jpeg().withMetadata({ orientation: 6 }).toBuffer();
    const { full } = await compress(input);
    expect(await sharp(full).metadata()).toMatchObject({ width: 200, height: 400 });
  });

  it("refuses bytes that are not an image", async () => {
    expect(await compressScreenshot(Buffer.from("not an image"))).toBeNull();
  });
});
