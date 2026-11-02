// What tools/export_models.py bakes for an item, narrowed to one wearer. A recipe holds
// every race's and sex's files, because a helm is cut once for each head.
import { BODY_REGIONS, type BodyRegion, type WornItem } from "./character";

/** A file for every wearer, or one per wearer as "hum", "bef" and so on. */
export type PerWearer = number | Record<string, number>;

export interface ItemRecipe {
  /** ItemDisplayInfo's GeosetGroup values: three for realm items, up to six for retail. */
  geosets?: number[];
  /** The display flags retail's geoset builder reads (character.ts PAD). */
  pad?: number;
  /** Each texture as [male, female]. */
  body?: Partial<Record<BodyRegion, [number, number]>>;
  model?: PerWearer;
  texture?: PerWearer;
  modelRight?: PerWearer;
  textureRight?: PerWearer;
  /** A cloak's backpack or quiver, hung on the back. */
  modelBack?: PerWearer;
  textureBack?: PerWearer;
  /** Models skinned to the body, each with the texture its object slot takes. */
  skinned?: { model: PerWearer; texture?: PerWearer }[];
  shield?: boolean;
  bow?: boolean;
  /** Geoset groups hidden, as [male, female][race, in the order of RACE_ORDER]. */
  hides?: number[][][];
  /** The item names files the CDN does not have, so it can only partly be drawn. */
  incomplete?: boolean;
}

/** export_models.py's RACES: the client's ChrRaces ids, with their file-name codes. */
const RACE_ORDER = [1, 2, 3, 4, 5, 6, 7, 8, 10, 11];
const RACE_CODE: Record<number, string> = { 1: "hu", 2: "or", 3: "dw", 4: "ni", 5: "sc", 6: "ta", 7: "gn", 8: "tr", 10: "be", 11: "dr" };

export function wornItem(slot: number, recipe: ItemRecipe, race: number, gender: number): WornItem {
  const body: WornItem["body"] = {};
  for (const region of BODY_REGIONS) {
    const files = recipe.body?.[region];
    if (files) body[region] = files[gender];
  }
  const wearer = `${RACE_CODE[race]}${gender ? "f" : "m"}`;
  const pick = (file: PerWearer | undefined) => (typeof file === "object" ? file[wearer] : file);
  // A piece cut for some bodies only, as a race's own armour, has nothing for the rest.
  const models = [recipe.model, recipe.modelRight, recipe.modelBack, ...(recipe.skinned ?? []).map((piece) => piece.model)];
  const missing = models.some((file) => file !== undefined && pick(file) === undefined);
  return {
    slot,
    geosets: recipe.geosets ?? [0, 0, 0],
    pad: recipe.pad,
    body,
    model: pick(recipe.model),
    texture: pick(recipe.texture),
    modelRight: pick(recipe.modelRight),
    textureRight: pick(recipe.textureRight),
    modelBack: pick(recipe.modelBack),
    textureBack: pick(recipe.textureBack),
    skinned: (recipe.skinned ?? []).flatMap((piece) => {
      const model = pick(piece.model);
      return model ? [{ model, texture: pick(piece.texture) }] : [];
    }),
    shield: recipe.shield,
    bow: recipe.bow,
    hides: recipe.hides?.[gender]?.[RACE_ORDER.indexOf(race)],
    missing,
  };
}
