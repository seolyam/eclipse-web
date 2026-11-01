// What tools/export_models.py bakes for an item, narrowed to one wearer. A recipe holds
// every race's and sex's files, because a helm is cut once for each head.
import { BODY_REGIONS, type BodyRegion, type WornItem } from "./character";

export interface ItemRecipe {
  geosets?: [number, number, number];
  /** Each texture as [male, female]. */
  body?: Partial<Record<BodyRegion, [number, number]>>;
  /** A file, or one per head as "hum", "bef" and so on. */
  model?: number | Record<string, number>;
  texture?: number;
  modelRight?: number;
  textureRight?: number;
  shield?: boolean;
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
  const model = typeof recipe.model === "object"
    ? recipe.model[`${RACE_CODE[race]}${gender ? "f" : "m"}`]
    : recipe.model;
  return {
    slot,
    geosets: recipe.geosets ?? [0, 0, 0],
    body,
    model,
    texture: recipe.texture,
    modelRight: recipe.modelRight,
    textureRight: recipe.textureRight,
    shield: recipe.shield,
    hides: recipe.hides?.[gender]?.[RACE_ORDER.indexOf(race)],
  };
}
