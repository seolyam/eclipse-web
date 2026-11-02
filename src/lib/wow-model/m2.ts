// The parts of an M2 model and its .skin file that a still figure needs. Vertices
// are stored in bind pose, in model space, so no bone has to move for it to stand.
// Field offsets: wowdev.wiki/M2 and wow.export's M2Loader (MIT).
import type { BonePose, Quat, Vec3 } from "./pose";

export interface M2Texture {
  /** 0 a file, else the role the game fills in: 1 skin, 2 object, 6 hair, and so on. */
  type: number;
  flags: number;
  /** FileDataID, or 0 when the type decides the texture. */
  file: number;
}

export interface M2 {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  boneIndices: Uint8Array;
  boneWeights: Uint8Array;
  textures: M2Texture[];
  materials: { flags: number; blend: number }[];
  textureLookup: number[];
  /** FileDataID of the first .skin, the full-detail one. */
  skinFile: number;
  /** Every bone at the first frame of an animation held in this file, else at rest. */
  bones(sequenceId: number): BonePose[];
}

export interface SkinSection {
  /** Which group of the body this is: 0 always, 501 boots, and so on. */
  geoset: number;
  material: number;
  /** Index into the texture lookup table. */
  texture: number;
  /** 0 is the surface itself; higher layers are effects drawn over it. */
  layer: number;
  indices: Uint32Array;
}

const VERTEX = 48;
const SEQUENCE = 64;
const BONE = 88;
const SUBMESH = 48;
const BATCH = 24;
/** A sequence with this flag lives in the .m2; without it, in a separate .anim file. */
const EMBEDDED = 0x20;

/** A signed 16-bit quaternion component, as the client expands it. */
const quatPart = (v: number) => (v < 0 ? v + 32768 : v - 32767) / 32767;

const tag = (view: DataView, at: number) => String.fromCharCode(...new Uint8Array(view.buffer, view.byteOffset + at, 4));

/** Splits a chunked file: MD21 wraps the model, with its file ids in chunks after it. */
function readChunks(buffer: ArrayBuffer) {
  const view = new DataView(buffer);
  const chunks = new Map<string, DataView>();
  for (let at = 0; at + 8 <= buffer.byteLength; ) {
    const size = view.getUint32(at + 4, true);
    chunks.set(tag(view, at), new DataView(buffer, at + 8, Math.min(size, buffer.byteLength - at - 8)));
    at += 8 + size;
  }
  return chunks;
}

const u32s = (chunk: DataView | undefined) => {
  if (!chunk) return [];
  return Array.from({ length: chunk.byteLength >> 2 }, (_, i) => chunk.getUint32(i * 4, true));
};

export function parseM2(buffer: ArrayBuffer): M2 {
  const first = buffer.byteLength >= 4 ? tag(new DataView(buffer), 0) : "";
  if (first !== "MD21" && first !== "MD20") throw new Error("Not an M2 model.");
  const chunks = first === "MD21" ? readChunks(buffer) : new Map<string, DataView>();
  const data = chunks.get("MD21") ?? new DataView(buffer);
  const textureFiles = u32s(chunks.get("TXID"));

  const count = (at: number) => data.getUint32(at, true);
  const offset = (at: number) => data.getUint32(at + 4, true);

  const vertexCount = count(0x3c);
  const vertexAt = offset(0x3c);
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const boneWeights = new Uint8Array(vertexCount * 4);
  const boneIndices = new Uint8Array(vertexCount * 4);
  for (let i = 0; i < vertexCount; i++) {
    const at = vertexAt + i * VERTEX;
    for (let axis = 0; axis < 3; axis++) {
      positions[i * 3 + axis] = data.getFloat32(at + axis * 4, true);
      normals[i * 3 + axis] = data.getFloat32(at + 20 + axis * 4, true);
    }
    for (let w = 0; w < 4; w++) {
      boneWeights[i * 4 + w] = data.getUint8(at + 12 + w);
      boneIndices[i * 4 + w] = data.getUint8(at + 16 + w);
    }
    uvs[i * 2] = data.getFloat32(at + 32, true);
    uvs[i * 2 + 1] = data.getFloat32(at + 36, true);
  }

  const textures = Array.from({ length: count(0x50) }, (_, i) => {
    const at = offset(0x50) + i * 16;
    return { type: data.getUint32(at, true), flags: data.getUint32(at + 4, true), file: textureFiles[i] ?? 0 };
  });
  const materials = Array.from({ length: count(0x70) }, (_, i) => {
    const at = offset(0x70) + i * 4;
    return { flags: data.getUint16(at, true), blend: data.getUint16(at + 2, true) };
  });
  const textureLookup = Array.from({ length: count(0x80) }, (_, i) => data.getUint16(offset(0x80) + i * 2, true));

  const readVec3 = (at: number): Vec3 => [data.getFloat32(at, true), data.getFloat32(at + 4, true), data.getFloat32(at + 8, true)];

  // A track is a list per sequence, each pointing at its keyframes. A sequence kept in
  // an .anim file has offsets into that file, so only embedded ones may be followed.
  const firstKey = (track: number, sequence: number): number | null => {
    const values = track + 12;
    if (sequence < 0 || sequence >= count(values)) return null;
    const entry = offset(values) + sequence * 8;
    return data.getUint32(entry, true) ? data.getUint32(entry + 4, true) : null;
  };

  const bones = (sequenceId: number): BonePose[] => {
    const sequence = Array.from({ length: count(0x1c) }, (_, i) => i).find((i) => {
      const at = offset(0x1c) + i * SEQUENCE;
      return data.getUint16(at, true) === sequenceId && (data.getUint32(at + 12, true) & EMBEDDED) !== 0;
    }) ?? -1;

    return Array.from({ length: count(0x2c) }, (_, i) => {
      const at = offset(0x2c) + i * BONE;
      const moved = firstKey(at + 16, sequence);
      const turned = firstKey(at + 36, sequence);
      const sized = firstKey(at + 56, sequence);
      const rotation: Quat = turned === null
        ? [0, 0, 0, 1]
        : [0, 2, 4, 6].map((o) => quatPart(data.getInt16(turned + o, true))) as Quat;
      return {
        parent: data.getInt16(at + 8, true),
        crc: data.getUint32(at + 12, true),
        pivot: readVec3(at + 76),
        translation: moved === null ? [0, 0, 0] : readVec3(moved),
        rotation,
        scale: sized === null ? [1, 1, 1] : readVec3(sized),
      };
    });
  };

  return {
    positions, normals, uvs, boneIndices, boneWeights, textures, materials, textureLookup,
    skinFile: u32s(chunks.get("SFID"))[0] ?? 0, bones,
  };
}

/** False when a .skin was cut for another version of the model than the one in hand. */
export function fitsModel(sections: SkinSection[], vertexCount: number): boolean {
  return sections.every((section) => section.indices.every((vertex) => vertex < vertexCount));
}

export function parseSkin(buffer: ArrayBuffer): { sections: SkinSection[] } {
  const data = new DataView(buffer);
  if (buffer.byteLength < 44 || tag(data, 0) !== "SKIN") throw new Error("Not a skin file.");
  const count = (at: number) => data.getUint32(at, true);
  const offset = (at: number) => data.getUint32(at + 4, true);

  const vertexAt = offset(4);
  const triangleAt = offset(12);
  const submeshAt = offset(28);

  const sections = Array.from({ length: count(36) }, (_, b) => {
    const batch = offset(36) + b * BATCH;
    const submesh = submeshAt + data.getUint16(batch + 4, true) * SUBMESH;
    // A section past 65,535 keeps the high bits of its start in its "level" field.
    const level = data.getUint16(submesh + 2, true);
    const indexStart = data.getUint16(submesh + 8, true) + (level << 16);
    const indexCount = data.getUint16(submesh + 10, true);
    const indices = new Uint32Array(indexCount);
    for (let i = 0; i < indexCount; i++) {
      const vertex = data.getUint16(triangleAt + (indexStart + i) * 2, true);
      indices[i] = data.getUint16(vertexAt + vertex * 2, true);
    }
    return {
      geoset: data.getUint16(submesh, true),
      material: data.getUint16(batch + 10, true),
      texture: data.getUint16(batch + 16, true),
      layer: data.getUint16(batch + 12, true),
      indices,
    };
  });
  return { sections };
}
