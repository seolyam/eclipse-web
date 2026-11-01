import { describe, expect, it } from "vitest";
import { decodeOutfit } from "@/lib/codec/outfit";
import { dressedCode } from "./dressing-room";

const decode = (code: string | null) => {
  const r = decodeOutfit(code ?? "");
  if (!r.ok) throw new Error(r.error);
  return r.outfit;
};

describe("a dressing room code", () => {
  it("has nothing to say until something is chosen", () => {
    expect(dressedCode({}, null)).toBeNull();
  });

  it("reads back in the game's format with every piece in its slot", () => {
    expect(decode(dressedCode({ 0: 1339122, 15: 410 }, null)).slots).toEqual({ 0: 1339122, 15: 410 });
  });

  it("hides a slot with item 0, which the game reads as hidden on purpose", () => {
    expect(decode(dressedCode({ 0: 0 }, null)).slots).toEqual({ 0: 0 });
  });

  it("leaves the race alone unless one is chosen", () => {
    expect(decode(dressedCode({ 0: 1339122 }, null)).look).toBeNull();
  });

  it("writes a chosen race as a look with the default appearance", () => {
    expect(decode(dressedCode({}, { race: 4, gender: 1 })).look).toEqual({
      kind: "look", race: 4, gender: 1, skin: 0, face: 0, hairStyle: 0, hairColour: 0, facialHair: 0,
    });
  });
});
