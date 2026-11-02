import { describe, expect, it } from "vitest";
import { attachmentsFor, bodyLayers, regionRect, SKIN_HEIGHT, SKIN_WIDTH, visibleGeosets, type WornItem } from "./character";

const SLOT = { head: 0, shoulders: 2, shirt: 3, chest: 4, waist: 5, legs: 6, feet: 7, wrists: 8, hands: 9, back: 14, main: 15, off: 16, ranged: 17, tabard: 18 };

const worn = (slot: number, over: Partial<WornItem> = {}): WornItem => ({ slot, geosets: [0, 0, 0], body: {}, ...over });

describe("which parts of the body show", () => {
  it("is the bare body with nothing on", () => {
    const shown = visibleGeosets([], 1);
    expect(shown.has(0)).toBe(true);
    expect(shown.has(401)).toBe(true);
    expect(shown.has(501)).toBe(true);
    expect(shown.has(1301)).toBe(true);
  });

  // Measured on the human bodies: 3201 is a 98-triangle stub, and 3202 the whole head.
  it("draws the parts an HD body keeps in groups of their own", () => {
    const shown = visibleGeosets([], 2);
    for (const part of [2001, 2201, 2301, 3202, 3301, 3401]) expect(shown.has(part), String(part)).toBe(true);
    expect(shown.has(3201)).toBe(false);
  });

  it("shows ears, and exactly one hairstyle", () => {
    const shown = visibleGeosets([], 3);
    expect(shown.has(702)).toBe(true);
    expect(shown.has(3)).toBe(true);
    expect(shown.has(1)).toBe(false);
    expect(shown.has(2)).toBe(false);
  });

  it("swaps a bare hand for a gloved one, and a bare foot for a boot", () => {
    const shown = visibleGeosets([worn(SLOT.hands, { geosets: [3, 0, 0] }), worn(SLOT.feet, { geosets: [2, 0, 0] })], 1);
    expect(shown.has(404)).toBe(true);
    expect(shown.has(401)).toBe(false);
    expect(shown.has(503)).toBe(true);
    expect(shown.has(501)).toBe(false);
  });

  it("gives a robe its skirt and sleeves", () => {
    const shown = visibleGeosets([worn(SLOT.chest, { geosets: [1, 0, 1] })], 1);
    expect(shown.has(802)).toBe(true);
    expect(shown.has(1302)).toBe(true);
    expect(shown.has(1301)).toBe(false);
  });

  it("does not let a piece with no opinion undo one that has it", () => {
    const shown = visibleGeosets([worn(SLOT.legs, { geosets: [0, 0, 0] }), worn(SLOT.chest, { geosets: [0, 0, 1] })], 1);
    expect(shown.has(1302)).toBe(true);
    const reversed = visibleGeosets([worn(SLOT.chest, { geosets: [0, 0, 1] }), worn(SLOT.legs, { geosets: [0, 0, 0] })], 1);
    expect(reversed.has(1302)).toBe(true);
  });

  it("hangs a cloak and a tabard", () => {
    const shown = visibleGeosets([worn(SLOT.back, { geosets: [1, 0, 0] }), worn(SLOT.tabard, { geosets: [1, 0, 0] })], 1);
    expect(shown.has(1502)).toBe(true);
    expect(shown.has(1202)).toBe(true);
  });

  // The client's head handler: a hidden group falls back to its first variant, which
  // for hair (geoset 1) is bald and for ears (701) is the earless head.
  it("hides what a helm says it hides, by falling back to the bare variant", () => {
    const shown = visibleGeosets([worn(SLOT.head, { hides: [0, 7] })], 3);
    expect(shown.has(3)).toBe(false);
    expect(shown.has(1)).toBe(true);
    expect(shown.has(702)).toBe(false);
    expect(shown.has(701)).toBe(true);
    expect(shown.has(0)).toBe(true);
  });
});

describe("the order armour paints onto the skin", () => {
  it("lays cloth under armour and gloves over sleeves, as the client does", () => {
    const items = [SLOT.hands, SLOT.tabard, SLOT.chest, SLOT.shirt, SLOT.waist, SLOT.feet, SLOT.legs, SLOT.wrists]
      .map((slot) => worn(slot, { body: { torsoUpper: slot + 1000 } }));
    expect(bodyLayers(items).map((l) => l.file - 1000)).toEqual([
      SLOT.shirt, SLOT.legs, SLOT.feet, SLOT.chest, SLOT.tabard, SLOT.waist, SLOT.wrists, SLOT.hands,
    ]);
  });

  it("gives each texture its own region", () => {
    const layers = bodyLayers([worn(SLOT.legs, { body: { legUpper: 7, legLower: 8 } })]);
    expect(layers).toEqual([{ region: "legUpper", file: 7 }, { region: "legLower", file: 8 }]);
  });
});

describe("the skin's layout", () => {
  // CharComponentTextureSections, layout 103 and every other two-to-one body.
  it("keeps the classic body map on the left of a two-to-one skin", () => {
    expect([SKIN_WIDTH, SKIN_HEIGHT]).toEqual([2048, 1024]);
    expect(regionRect("armUpper")).toEqual([0, 0, 512, 256]);
    expect(regionRect("legUpper")).toEqual([512, 384, 512, 256]);
    expect(regionRect("foot")).toEqual([512, 896, 512, 128]);
  });

  it("gives the face the whole right half", () => {
    expect(regionRect("face")).toEqual([1024, 0, 1024, 1024]);
  });

  it("leaves no gap between the body regions", () => {
    const names = ["armUpper", "armLower", "hand", "torsoUpper", "torsoLower", "legUpper", "legLower", "foot"] as const;
    const area = names.reduce((sum, n) => {
      const [, , w, h] = regionRect(n);
      return sum + w * h;
    }, 0);
    // The hands stop short of a face panel the classic map kept under them.
    expect(area).toBe(SKIN_HEIGHT * SKIN_HEIGHT - 512 * 384);
  });
});

describe("where a model hangs", () => {
  it("puts a helm on the head and pauldrons on both shoulders", () => {
    // Measured over 79 helms on an HD human, head 1.76..2.11: at 11 the median helm
    // spans 1.58..2.03, around the neck, and at 55 it spans 1.75..2.20.
    expect(attachmentsFor(worn(SLOT.head, { model: 1 }))).toEqual([{ attachment: 55, model: 1, texture: undefined }]);
    expect(attachmentsFor(worn(SLOT.shoulders, { model: 1, texture: 2, modelRight: 3, textureRight: 4 }))).toEqual([
      { attachment: 6, model: 1, texture: 2 },
      { attachment: 5, model: 3, texture: 4 },
    ]);
  });

  it("puts a weapon in its hand, a shield on the arm and a ranged weapon on the back", () => {
    expect(attachmentsFor(worn(SLOT.main, { model: 1 }))[0].attachment).toBe(1);
    expect(attachmentsFor(worn(SLOT.off, { model: 1 }))[0].attachment).toBe(2);
    expect(attachmentsFor(worn(SLOT.off, { model: 1, shield: true }))[0].attachment).toBe(0);
    expect(attachmentsFor(worn(SLOT.ranged, { model: 1 }))[0].attachment).toBe(26);
  });

  it("has nothing to hang for a piece that is only texture", () => {
    expect(attachmentsFor(worn(SLOT.chest))).toEqual([]);
  });
});
