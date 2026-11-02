import { describe, expect, it } from "vitest";
import { wornItem, type ItemRecipe } from "./recipe";

const HUMAN = 1;
const NIGHT_ELF = 4;
const FEMALE = 1;
const MALE = 0;
const HEAD = 0;
const CHEST = 4;
const OFF_HAND = 16;

describe("wearing a recipe", () => {
  it("picks the body texture for the wearer's sex", () => {
    const recipe: ItemRecipe = { body: { torsoUpper: [10, 20], armUpper: [30, 30] } };
    expect(wornItem(CHEST, recipe, HUMAN, MALE).body).toEqual({ torsoUpper: 10, armUpper: 30 });
    expect(wornItem(CHEST, recipe, HUMAN, FEMALE).body).toEqual({ torsoUpper: 20, armUpper: 30 });
  });

  it("picks the head model cut for this race and sex", () => {
    const recipe: ItemRecipe = { model: { hum: 1, huf: 2, nim: 3 } };
    expect(wornItem(HEAD, recipe, HUMAN, FEMALE).model).toBe(2);
    expect(wornItem(HEAD, recipe, NIGHT_ELF, MALE).model).toBe(3);
  });

  it("leaves a head with no cut for this body bare, and says it is missing", () => {
    const worn = wornItem(HEAD, { model: { hum: 1 } }, NIGHT_ELF, FEMALE);
    expect(worn.model).toBeUndefined();
    expect(worn.missing).toBe(true);
    expect(wornItem(HEAD, { model: { hum: 1 } }, HUMAN, MALE).missing).toBe(false);
  });

  it("says a skinned piece cut only for other bodies is missing on this one", () => {
    expect(wornItem(CHEST, { skinned: [{ model: { dwm: 1 } }] }, HUMAN, MALE).missing).toBe(true);
    expect(wornItem(CHEST, { skinned: [{ model: { dwm: 1 } }] }, 3, MALE).missing).toBe(false);
  });

  it("uses one model for every body when there is only one", () => {
    expect(wornItem(OFF_HAND, { model: 9, shield: true }, NIGHT_ELF, FEMALE)).toMatchObject({ model: 9, shield: true });
  });

  it("reads what a helm hides for this sex and race", () => {
    const recipe: ItemRecipe = {
      model: { hum: 1 },
      hides: [[[0], [], [], [7], [], [], [], [], [], []], [[1], [], [], [], [], [], [], [], [], []]],
    };
    expect(wornItem(HEAD, recipe, HUMAN, MALE).hides).toEqual([0]);
    expect(wornItem(HEAD, recipe, NIGHT_ELF, MALE).hides).toEqual([7]);
    expect(wornItem(HEAD, recipe, HUMAN, FEMALE).hides).toEqual([1]);
  });

  it("puts on the skinned pieces cut for this race and sex, with their textures", () => {
    const recipe: ItemRecipe = { skinned: [{ model: { hum: 1, huf: 2 }, texture: 5 }, { model: 7, texture: { huf: 8 } }] };
    expect(wornItem(CHEST, recipe, HUMAN, FEMALE).skinned).toEqual([{ model: 2, texture: 5 }, { model: 7, texture: 8 }]);
    expect(wornItem(CHEST, recipe, HUMAN, MALE).skinned).toEqual([{ model: 1, texture: 5 }, { model: 7, texture: undefined }]);
  });

  it("leaves out a skinned piece with no cut for this body", () => {
    expect(wornItem(CHEST, { skinned: [{ model: { hum: 1 } }] }, NIGHT_ELF, MALE).skinned).toEqual([]);
  });

  it("picks a texture cut for this body, as it picks a model", () => {
    expect(wornItem(HEAD, { model: 1, texture: { nif: 4 } }, NIGHT_ELF, FEMALE).texture).toBe(4);
    expect(wornItem(HEAD, { model: 1, texture: { nif: 4 } }, HUMAN, FEMALE).texture).toBeUndefined();
  });

  it("carries what a cloak hangs on the back", () => {
    expect(wornItem(14, { texture: 1, modelBack: { hum: 2 }, textureBack: 3 }, HUMAN, MALE)).toMatchObject({ modelBack: 2, textureBack: 3, missing: false });
    expect(wornItem(14, { modelBack: { hum: 2 } }, NIGHT_ELF, MALE).missing).toBe(true);
  });

  it("keeps every retail geoset value and the display's flags", () => {
    expect(wornItem(CHEST, { geosets: [0, 0, 1, 1, 2], pad: 2 }, HUMAN, MALE)).toMatchObject({ geosets: [0, 0, 1, 1, 2], pad: 2 });
  });

  it("defaults geosets to no opinion", () => {
    expect(wornItem(CHEST, {}, HUMAN, MALE).geosets).toEqual([0, 0, 0]);
    expect(wornItem(CHEST, { geosets: [1, 0, 1] }, HUMAN, MALE).geosets).toEqual([1, 0, 1]);
  });
});
