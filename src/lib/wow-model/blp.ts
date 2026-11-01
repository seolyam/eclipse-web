// BLP2, the game's texture format, decoded to RGBA in software. Compositing a
// character needs the pixels on a canvas, which a compressed GPU texture cannot give.

export interface Image {
  width: number;
  height: number;
  rgba: Uint8Array;
}

/** The palette starts where the fixed header ends. */
const HEADER = 148;

/** An RGB565 colour as 8-bit channels, the way S3TC expands them. */
function expand565(c: number): [number, number, number] {
  const r = (c >> 11) & 31;
  const g = (c >> 5) & 63;
  const b = c & 31;
  return [(r << 3) | (r >> 2), (g << 2) | (g >> 4), (b << 3) | (b >> 2)];
}

function colourTable(c0: number, c1: number, punchThrough: boolean) {
  const a = expand565(c0);
  const b = expand565(c1);
  const mix = (x: number, y: number, wx: number, wy: number) =>
    a.map((_, i) => Math.floor((a[i] * x + b[i] * y) / (wx + wy))) as unknown as [number, number, number];
  if (c0 > c1 || !punchThrough) {
    return [a, b, mix(2, 1, 2, 1), mix(1, 2, 1, 2)];
  }
  return [a, b, mix(1, 1, 1, 1), [0, 0, 0] as [number, number, number]];
}

function dxt5Alphas(a0: number, a1: number) {
  const table = [a0, a1];
  if (a0 > a1) for (let i = 1; i <= 6; i++) table.push(Math.floor(((7 - i) * a0 + i * a1) / 7));
  else {
    for (let i = 1; i <= 4; i++) table.push(Math.floor(((5 - i) * a0 + i * a1) / 5));
    table.push(0, 255);
  }
  return table;
}

function decodeDxt(src: Uint8Array, width: number, height: number, format: "dxt1" | "dxt3" | "dxt5"): Uint8Array {
  const view = new DataView(src.buffer, src.byteOffset, src.byteLength);
  const rgba = new Uint8Array(width * height * 4);
  const blockSize = format === "dxt1" ? 8 : 16;
  let at = 0;
  for (let by = 0; by < height; by += 4) {
    for (let bx = 0; bx < width; bx += 4, at += blockSize) {
      if (at + blockSize > src.length) return rgba;
      const colourAt = format === "dxt1" ? at : at + 8;
      const c0 = view.getUint16(colourAt, true);
      const c1 = view.getUint16(colourAt + 2, true);
      const colours = colourTable(c0, c1, format === "dxt1");
      const indices = view.getUint32(colourAt + 4, true);
      const alphas = format === "dxt5" ? dxt5Alphas(src[at], src[at + 1]) : null;
      for (let py = 0; py < 4; py++) {
        for (let px = 0; px < 4; px++) {
          const x = bx + px;
          const y = by + py;
          if (x >= width || y >= height) continue;
          const pixel = py * 4 + px;
          const index = (indices >>> (2 * pixel)) & 3;
          const [r, g, b] = colours[index];
          let alpha = 255;
          if (format === "dxt1") {
            if (c0 <= c1 && index === 3) alpha = 0;
          } else if (format === "dxt3") {
            alpha = ((src[at + (pixel >> 1)] >> ((pixel & 1) * 4)) & 15) * 17;
          } else if (alphas) {
            // 48 bits of 3-bit indices, read from whichever two bytes hold this one.
            const bit = pixel * 3;
            const byte = at + 2 + (bit >> 3);
            const pair = src[byte] | ((byte + 1 < at + 8 ? src[byte + 1] : 0) << 8);
            alpha = alphas[(pair >> (bit & 7)) & 7];
          }
          const out = (y * width + x) * 4;
          rgba[out] = r;
          rgba[out + 1] = g;
          rgba[out + 2] = b;
          rgba[out + 3] = alpha;
        }
      }
    }
  }
  return rgba;
}

function decodePalette(file: Uint8Array, src: Uint8Array, width: number, height: number, alphaDepth: number) {
  const rgba = new Uint8Array(width * height * 4);
  const count = width * height;
  const alphaBit = (i: number) => {
    if (alphaDepth === 1) return (src[count + (i >> 3)] >> (i & 7)) & 1 ? 255 : 0;
    if (alphaDepth === 4) return ((src[count + (i >> 1)] >> ((i & 1) * 4)) & 15) * 17;
    if (alphaDepth === 8) return src[count + i];
    return 255;
  };
  for (let i = 0; i < count; i++) {
    const entry = HEADER + src[i] * 4;
    rgba[i * 4] = file[entry + 2];
    rgba[i * 4 + 1] = file[entry + 1];
    rgba[i * 4 + 2] = file[entry];
    rgba[i * 4 + 3] = alphaBit(i);
  }
  return rgba;
}

export function decodeBlp(file: Uint8Array): Image {
  const view = new DataView(file.buffer, file.byteOffset, file.byteLength);
  if (view.getUint32(0, true) !== 0x32504c42) throw new Error("Not a BLP2 texture.");
  const encoding = file[8];
  const alphaDepth = file[9];
  const alphaType = file[10];
  const width = view.getUint32(12, true);
  const height = view.getUint32(16, true);
  const offset = view.getUint32(20, true);
  const size = view.getUint32(84, true);
  const src = file.subarray(offset, offset + size);

  if (encoding === 1) return { width, height, rgba: decodePalette(file, src, width, height, alphaDepth) };
  if (encoding === 2) {
    const format = alphaDepth <= 1 ? "dxt1" : alphaType === 7 ? "dxt5" : "dxt3";
    return { width, height, rgba: decodeDxt(src, width, height, format) };
  }
  if (encoding === 3) {
    const rgba = src.slice(0, width * height * 4);
    for (let i = 0; i < rgba.length; i += 4) {
      const blue = rgba[i];
      rgba[i] = rgba[i + 2];
      rgba[i + 2] = blue;
    }
    return { width, height, rgba };
  }
  throw new Error(`Unknown BLP encoding ${encoding}.`);
}
