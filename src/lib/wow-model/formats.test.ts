import { deflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { decodeBlp } from "./blp";
import { decodeBlte } from "./blte";
import { fitsModel, parseM2, parseSkin } from "./m2";

const bytes = (...parts: (number[] | Uint8Array)[]) => Uint8Array.from(parts.flatMap((p) => [...p]));
const be32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));

describe("BLTE, the CDN's container", () => {
  it("reads one block with no table", async () => {
    const file = bytes(ascii("BLTE"), be32(0), ascii("N"), [1, 2, 3]);
    expect(await decodeBlte(file)).toEqual(Uint8Array.of(1, 2, 3));
  });

  it("joins plain and zlib blocks in table order", async () => {
    const plain = bytes(ascii("N"), [9, 8]);
    const zipped = bytes(ascii("Z"), deflateSync(Uint8Array.of(7, 6, 5)));
    const entry = (b: Uint8Array, size: number) => [...be32(b.length), ...be32(size), ...new Array<number>(16).fill(0)];
    const table = bytes([0x0f, 0, 0, 2], entry(plain, 2), entry(zipped, 3));
    const file = bytes(ascii("BLTE"), be32(8 + table.length), table, plain, zipped);
    expect(await decodeBlte(file)).toEqual(Uint8Array.of(9, 8, 7, 6, 5));
  });

  it("refuses what it cannot read rather than guessing", async () => {
    await expect(decodeBlte(bytes(ascii("BLTE"), be32(0), ascii("E"), [1]))).rejects.toThrow(/encrypted/i);
    await expect(decodeBlte(bytes(ascii("NOPE"), be32(0)))).rejects.toThrow(/BLTE/);
  });
});

// One 148-byte header, then the palette, as the client lays out a BLP2.
function blp({ encoding, alphaDepth, alphaType, width, height, body }: {
  encoding: number; alphaDepth: number; alphaType: number; width: number; height: number; body: number[];
}) {
  const buffer = new ArrayBuffer(1172 + body.length);
  const view = new DataView(buffer);
  new Uint8Array(buffer).set(ascii("BLP2"));
  view.setUint32(4, 1, true);
  view.setUint8(8, encoding);
  view.setUint8(9, alphaDepth);
  view.setUint8(10, alphaType);
  view.setUint32(12, width, true);
  view.setUint32(16, height, true);
  view.setUint32(20, 1172, true);
  view.setUint32(84, body.length, true);
  new Uint8Array(buffer).set(body, 1172);
  return new Uint8Array(buffer);
}

describe("BLP textures", () => {
  it("reads raw BGRA into RGBA", () => {
    const image = decodeBlp(blp({ encoding: 3, alphaDepth: 8, alphaType: 0, width: 1, height: 1, body: [10, 20, 30, 40] }));
    expect(image).toMatchObject({ width: 1, height: 1 });
    expect([...image.rgba]).toEqual([30, 20, 10, 40]);
  });

  it("decodes a DXT1 block: both end colours and the mix between them", () => {
    // White then black, indices 0,1,2,3 on the first row and 0 after.
    const body = [0xff, 0xff, 0x00, 0x00, 0b11100100, 0, 0, 0];
    const { rgba, width } = decodeBlp(blp({ encoding: 2, alphaDepth: 0, alphaType: 0, width: 4, height: 4, body }));
    expect(width).toBe(4);
    expect([...rgba.slice(0, 4)]).toEqual([255, 255, 255, 255]);
    expect([...rgba.slice(4, 8)]).toEqual([0, 0, 0, 255]);
    expect(rgba[8]).toBe(170);
    expect(rgba[12]).toBe(85);
  });

  it("reads DXT5 alpha from its own block", () => {
    const body = [200, 100, 0, 0, 0, 0, 0, 0, 0xff, 0xff, 0x00, 0x00, 0, 0, 0, 0];
    const { rgba } = decodeBlp(blp({ encoding: 2, alphaDepth: 8, alphaType: 7, width: 4, height: 4, body }));
    expect(rgba[3]).toBe(200);
  });

  it("refuses a file that is not a BLP2", () => {
    expect(() => decodeBlp(Uint8Array.from(ascii("BLP1____")))).toThrow(/BLP2/);
  });
});

const MD20_SIZE = 0x130;

// A chunked model: one triangle, one texture, one attachment, and the ids of its files.
function model() {
  const arrays = new Map<number, [count: number, data: Uint8Array]>();
  const f32 = (...n: number[]) => new Uint8Array(Float32Array.from(n).buffer);
  const u32 = (...n: number[]) => new Uint8Array(Uint32Array.from(n).buffer);
  const u16 = (...n: number[]) => new Uint8Array(Uint16Array.from(n).buffer);
  const vertex = (x: number) => bytes(f32(x, 2, 3), new Array<number>(8).fill(0), f32(0, 0, 1), f32(0.5, 0.25), f32(0, 0));
  arrays.set(0x3c, [3, bytes(vertex(1), vertex(4), vertex(7))]);
  arrays.set(0x50, [1, u32(2, 3, 0, 0)]);
  arrays.set(0x70, [1, u16(0, 1)]);
  arrays.set(0x80, [1, u16(0)]);
  const track = new Array<number>(20).fill(0);
  arrays.set(0xf0, [1, bytes(u32(11), u16(5, 0), f32(0.5, 1.5, 2.5), track)]);
  arrays.set(0xf8, [12, u16(...new Array<number>(11).fill(0xffff), 0)]);

  let size = MD20_SIZE;
  const md20 = new Uint8Array(4096);
  const view = new DataView(md20.buffer);
  md20.set(ascii("MD20"));
  view.setUint32(4, 274, true);
  for (const [at, [count, data]] of arrays) {
    view.setUint32(at, count, true);
    view.setUint32(at + 4, size, true);
    md20.set(data, size);
    size += data.length;
  }
  view.setUint32(0x44, 1, true);
  const body = md20.subarray(0, size);
  const chunk = (tag: string, data: Uint8Array) => bytes(ascii(tag), new Uint8Array(u32(data.length).buffer), data);
  return bytes(chunk("MD21", body), chunk("SFID", u32(1234)), chunk("TXID", u32(5678))).buffer;
}

describe("M2 models", () => {
  it("reads vertices, textures and the ids of its other files", () => {
    const m2 = parseM2(model());
    expect([...m2.positions]).toEqual([1, 2, 3, 4, 2, 3, 7, 2, 3]);
    expect([...m2.normals.slice(0, 3)]).toEqual([0, 0, 1]);
    expect([...m2.uvs.slice(0, 2)]).toEqual([0.5, 0.25]);
    expect(m2.textures).toEqual([{ type: 2, flags: 3, file: 5678 }]);
    expect(m2.skinFile).toBe(1234);
    expect(m2.materials).toEqual([{ flags: 0, blend: 1 }]);
    expect(m2.textureLookup).toEqual([0]);
  });

  it("finds an attachment point through the lookup table", () => {
    const m2 = parseM2(model());
    const helm = m2.attachment(11);
    expect(helm?.position[0]).toBeCloseTo(0.5);
    expect(helm?.position[2]).toBeCloseTo(2.5);
    expect(m2.attachment(5)).toBeNull();
  });

  it("refuses a file that is not a model", () => {
    expect(() => parseM2(Uint8Array.from(ascii("NOPE____")).buffer)).toThrow(/M2/);
  });
});

function skin() {
  const u16 = (...n: number[]) => new Uint8Array(Uint16Array.from(n).buffer);
  const out = new Uint8Array(512);
  const view = new DataView(out.buffer);
  out.set(ascii("SKIN"));
  const put = (at: number, count: number, offset: number, data: Uint8Array) => {
    view.setUint32(at, count, true);
    view.setUint32(at + 4, offset, true);
    out.set(data, offset);
  };
  put(4, 3, 64, u16(10, 11, 12));
  put(12, 3, 72, u16(2, 1, 0));
  const submesh = new Uint8Array(48);
  new DataView(submesh.buffer).setUint16(0, 501, true);
  new DataView(submesh.buffer).setUint16(8, 0, true);
  new DataView(submesh.buffer).setUint16(10, 3, true);
  put(28, 1, 80, submesh);
  const batch = new Uint8Array(24);
  const batchView = new DataView(batch.buffer);
  batchView.setUint16(4, 0, true);
  batchView.setUint16(10, 0, true);
  batchView.setUint16(14, 1, true);
  batchView.setUint16(16, 0, true);
  put(36, 1, 128, batch);
  return out.buffer;
}

describe("skin files", () => {
  it("resolves triangles through the vertex table, section by section", () => {
    const { sections } = parseSkin(skin());
    expect(sections).toHaveLength(1);
    expect(sections[0]).toMatchObject({ geoset: 501, material: 0, texture: 0 });
    expect([...sections[0].indices]).toEqual([12, 11, 10]);
  });

  // Past the end of the vertex buffer the GPU draws whatever is in memory there.
  it("says whether every triangle lands on a vertex the model has", () => {
    const { sections } = parseSkin(skin());
    expect(fitsModel(sections, 13)).toBe(true);
    expect(fitsModel(sections, 12)).toBe(false);
  });

  it("refuses a file that is not a skin", () => {
    expect(() => parseSkin(Uint8Array.from(ascii("NOPE____")).buffer)).toThrow(/skin/i);
  });
});
