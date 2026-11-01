// BLTE is how the game's CDN stores a file: a table of blocks, each plain or zlib.
// Every block is decoded here, in the browser, because the CDN only sends ranges.

const concat = (parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((sum, p) => sum + p.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
};

async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function decodeBlock(block: Uint8Array): Promise<Uint8Array> {
  const mode = String.fromCharCode(block[0]);
  if (mode === "N") return block.subarray(1);
  if (mode === "Z") return inflate(block.subarray(1));
  if (mode === "E") throw new Error("This file is encrypted.");
  throw new Error(`Unknown BLTE block mode ${mode}.`);
}

export async function decodeBlte(file: Uint8Array): Promise<Uint8Array> {
  const view = new DataView(file.buffer, file.byteOffset, file.byteLength);
  if (view.getUint32(0) !== 0x424c5445) throw new Error("Not a BLTE file.");
  const headerSize = view.getUint32(4);
  if (!headerSize) return decodeBlock(file.subarray(8));

  const count = view.getUint32(8) & 0xffffff;
  const blocks: Uint8Array[] = [];
  let at = headerSize;
  for (let i = 0; i < count; i++) {
    const size = view.getUint32(12 + i * 24);
    blocks.push(file.subarray(at, at + size));
    at += size;
  }
  return concat(await Promise.all(blocks.map(decodeBlock)));
}
