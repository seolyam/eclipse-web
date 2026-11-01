import "server-only";
import sharp from "sharp";

// Every stored screenshot comes through here, so a capture's size, format and
// metadata are the site's choice and not the uploader's. Measured on game art
// against WebP q80: AVIF q55 is 25-40% smaller at the same or better SSIM. Effort 4
// takes about 350ms; effort 6 takes three times that and saves almost nothing.

export const SCREENSHOT_TYPE = "image/avif";
export const SCREENSHOT_EXTENSION = "avif";

// The post's frame is 4:5 and crops a wide capture by height, so these are long
// edges that stay sharp at 2x. Supabase's own resizing is not on the Free plan.
const FULL = { edge: 1600, quality: 55 };
const THUMB = { edge: 960, quality: 50 };

// Just above 8K, which is 33 million: a small file can decode to a huge image.
const MAX_INPUT_PIXELS = 40_000_000;

function encode(input: Buffer, { edge, quality }: { edge: number; quality: number }) {
  return sharp(input, { limitInputPixels: MAX_INPUT_PIXELS })
    .rotate() // Applies the file's orientation, which is about to be dropped.
    .resize({ width: edge, height: edge, fit: "inside", withoutEnlargement: true })
    .avif({ quality, effort: 4 }) // sharp keeps no metadata unless asked: no EXIF, no GPS.
    .toBuffer();
}

/** A capture's two stored copies, or null when its bytes are not an image. */
export async function compressScreenshot(input: Buffer) {
  try {
    const [full, thumb] = await Promise.all([encode(input, FULL), encode(input, THUMB)]);
    return { full, thumb };
  } catch {
    return null;
  }
}
