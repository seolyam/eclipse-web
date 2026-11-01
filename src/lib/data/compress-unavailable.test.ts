import { expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("sharp", () => {
  throw new Error('Could not load the "sharp" module');
});

// sharp is a native binary. Pages read through the file that imports this one, so a
// binary that fails to load must cost uploads, never the whole site.
it("does not need the image library until a screenshot is uploaded", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const { compressScreenshot } = await import("./compress");
  expect(await compressScreenshot(Buffer.from("a capture"))).toBeNull();
  expect(console.error).toHaveBeenCalled();
});
