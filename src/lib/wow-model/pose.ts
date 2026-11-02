// One still frame of a skeleton. Each bone is parent x pivot x translate x rotate x
// scale x unpivot, the order the client composes them, and a vertex is the weighted
// sum of its bones. Matrices are column-major, the layout WebGL and three.js expect.

export type Vec3 = [number, number, number];
export type Quat = [number, number, number, number];
export type Mat4 = Float64Array;

export interface BonePose {
  /** -1 for a root. */
  parent: number;
  pivot: Vec3;
  translation: Vec3;
  rotation: Quat;
  scale: Vec3;
  /** The hash of the bone's name, which a skinned piece's bones are matched on. */
  crc?: number;
}

export interface Attachment {
  bone: number;
  position: Vec3;
}

/**
 * What tools/export_models.py keeps of a body's .skel: the first frame of Stand, as
 * [parent, pivot x3, translation x3, rotation x4, scale x3, name hash] for each bone. A
 * still figure needs nothing else from a file of nearly 20 MB.
 */
export interface BakedPose {
  bones: number[][];
  /** Attachment id -> [bone, x, y, z]. */
  attachments: Record<string, [number, number, number, number]>;
}

export function readPose(baked: BakedPose) {
  const vec3 = (row: number[], at: number): Vec3 => [row[at], row[at + 1], row[at + 2]];
  return {
    bones: baked.bones.map((row): BonePose => ({
      parent: row[0],
      pivot: vec3(row, 1),
      translation: vec3(row, 4),
      rotation: [row[7], row[8], row[9], row[10]],
      scale: vec3(row, 11),
      crc: row[14],
    })),
    attachment(id: number): Attachment | null {
      const point = baked.attachments[id];
      return point ? { bone: point[0], position: vec3(point, 1) } : null;
    },
  };
}

export const IDENTITY: Mat4 = Float64Array.of(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);

export function multiply(a: Mat4, b: Mat4): Mat4 {
  const out = new Float64Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      out[c * 4 + r] =
        a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
  }
  return out;
}

const translate = ([x, y, z]: Vec3): Mat4 => Float64Array.of(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1);
const scale = ([x, y, z]: Vec3): Mat4 => Float64Array.of(x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1);

function rotate([x, y, z, w]: Quat): Mat4 {
  const [xx, yy, zz] = [x * x, y * y, z * z];
  const [xy, xz, yz] = [x * y, x * z, y * z];
  const [wx, wy, wz] = [w * x, w * y, w * z];
  return Float64Array.of(
    1 - 2 * (yy + zz), 2 * (xy + wz), 2 * (xz - wy), 0,
    2 * (xy - wz), 1 - 2 * (xx + zz), 2 * (yz + wx), 0,
    2 * (xz + wy), 2 * (yz - wx), 1 - 2 * (xx + yy), 0,
    0, 0, 0, 1,
  );
}

/**
 * Every bone's model-space matrix. A parent may be listed after its child. `given` fixes
 * a bone's matrix outright, as a skinned piece's bones take the body's.
 */
export function solveBones(bones: BonePose[], given: (index: number) => Mat4 | undefined = () => undefined): Mat4[] {
  const solved: (Mat4 | undefined)[] = new Array(bones.length);
  const solve = (i: number): Mat4 => {
    const done = solved[i] ?? given(i);
    if (done) return (solved[i] = done);
    const b = bones[i];
    const own = [
      translate(b.pivot),
      translate(b.translation),
      rotate(b.rotation),
      scale(b.scale),
      translate([-b.pivot[0], -b.pivot[1], -b.pivot[2]]),
    ].reduce(multiply);
    const matrix = b.parent >= 0 ? multiply(solve(b.parent), own) : own;
    solved[i] = matrix;
    return matrix;
  };
  return bones.map((_, i) => solve(i));
}

export function transformPoint(m: Mat4, [x, y, z]: Vec3): Vec3 {
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14],
  ];
}

export const translation = (m: Mat4): Vec3 => [m[12], m[13], m[14]];

/** Vertices in their posed places. Weights are 0..255 and sum to 255. */
export function skinVertices(
  positions: Float32Array,
  normals: Float32Array,
  boneIndices: Uint8Array,
  boneWeights: Uint8Array,
  matrices: Mat4[],
): { positions: Float32Array; normals: Float32Array } {
  const count = positions.length / 3;
  const outPositions = new Float32Array(positions.length);
  const outNormals = new Float32Array(normals.length);
  for (let v = 0; v < count; v++) {
    const [px, py, pz] = [positions[v * 3], positions[v * 3 + 1], positions[v * 3 + 2]];
    const [nx, ny, nz] = [normals[v * 3], normals[v * 3 + 1], normals[v * 3 + 2]];
    let [x, y, z, a, b, c] = [0, 0, 0, 0, 0, 0];
    for (let w = 0; w < 4; w++) {
      const weight = boneWeights[v * 4 + w] / 255;
      if (!weight) continue;
      const m = matrices[boneIndices[v * 4 + w]];
      x += weight * (m[0] * px + m[4] * py + m[8] * pz + m[12]);
      y += weight * (m[1] * px + m[5] * py + m[9] * pz + m[13]);
      z += weight * (m[2] * px + m[6] * py + m[10] * pz + m[14]);
      a += weight * (m[0] * nx + m[4] * ny + m[8] * nz);
      b += weight * (m[1] * nx + m[5] * ny + m[9] * nz);
      c += weight * (m[2] * nx + m[6] * ny + m[10] * nz);
    }
    const length = Math.hypot(a, b, c) || 1;
    outPositions.set([x, y, z], v * 3);
    outNormals.set([a / length, b / length, c / length], v * 3);
  }
  return { positions: outPositions, normals: outNormals };
}
