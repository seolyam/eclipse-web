import { describe, expect, it } from "vitest";
import { IDENTITY, solveBones, skinVertices, transformPoint, translation, type BonePose } from "./pose";

const bone = (over: Partial<BonePose> = {}): BonePose => ({
  parent: -1,
  pivot: [0, 0, 0],
  translation: [0, 0, 0],
  rotation: [0, 0, 0, 1],
  scale: [1, 1, 1],
  ...over,
});

// A quarter turn about Z, which takes +X to +Y.
const QUARTER_Z: BonePose["rotation"] = [0, 0, Math.SQRT1_2, Math.SQRT1_2];

const close = (actual: ArrayLike<number>, expected: number[]) => {
  expect(actual).toHaveLength(expected.length);
  expected.forEach((v, i) => expect(actual[i]).toBeCloseTo(v, 5));
};

describe("solving a skeleton", () => {
  it("leaves a bone at rest where the model drew it", () => {
    const [m] = solveBones([bone({ pivot: [1, 2, 3] })]);
    close(transformPoint(m, [4, 5, 6]), [4, 5, 6]);
  });

  it("moves a bone by its translation", () => {
    const [m] = solveBones([bone({ translation: [0, 0, 2] })]);
    close(transformPoint(m, [1, 0, 0]), [1, 0, 2]);
  });

  it("turns a bone about its pivot, not the model's origin", () => {
    const [m] = solveBones([bone({ pivot: [1, 0, 0], rotation: QUARTER_Z })]);
    close(transformPoint(m, [1, 0, 0]), [1, 0, 0]);
    close(transformPoint(m, [2, 0, 0]), [1, 1, 0]);
  });

  it("carries a child along with its parent, whatever order they are listed in", () => {
    const bones = [bone({ parent: 1, translation: [0, 1, 0] }), bone({ translation: [5, 0, 0] })];
    const [child] = solveBones(bones);
    close(transformPoint(child, [0, 0, 0]), [5, 1, 0]);
  });

  it("scales about the pivot", () => {
    const [m] = solveBones([bone({ pivot: [1, 0, 0], scale: [2, 2, 2] })]);
    close(transformPoint(m, [2, 0, 0]), [3, 0, 0]);
  });

  it("reads a position straight off a matrix", () => {
    close(translation(solveBones([bone({ translation: [1, 2, 3] })])[0]), [1, 2, 3]);
    close(translation(IDENTITY), [0, 0, 0]);
  });
});

describe("skinning a vertex", () => {
  const moved = solveBones([bone(), bone({ translation: [0, 0, 2] })]);

  it("follows the one bone that owns it", () => {
    const { positions } = skinVertices(
      Float32Array.of(1, 0, 0), Float32Array.of(0, 0, 1),
      Uint8Array.of(0, 0, 0, 1), Uint8Array.of(0, 0, 0, 255), moved,
    );
    close(positions, [1, 0, 2]);
  });

  it("blends between bones by weight", () => {
    const { positions } = skinVertices(
      Float32Array.of(0, 0, 0), Float32Array.of(0, 0, 1),
      Uint8Array.of(0, 1, 0, 0), Uint8Array.of(128, 127, 0, 0), moved,
    );
    expect(positions[2]).toBeCloseTo((2 * 127) / 255, 5);
  });

  it("turns normals with the bone and keeps them unit length", () => {
    const turned = solveBones([bone({ rotation: QUARTER_Z })]);
    const { normals } = skinVertices(
      Float32Array.of(0, 0, 0), Float32Array.of(1, 0, 0),
      Uint8Array.of(0, 0, 0, 0), Uint8Array.of(255, 0, 0, 0), turned,
    );
    close(normals, [0, 1, 0]);
  });
});
