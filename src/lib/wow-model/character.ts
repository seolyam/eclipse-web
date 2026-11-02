// How a piece of gear changes a character. Three things happen: textures paint onto
// the body's skin, geosets swap (a bare hand for a glove), and models hang off
// attachment points (a helm on the head). Rules: wow.export (MIT) and the 3.3.5a client.

export const BODY_REGIONS = ["armUpper", "armLower", "hand", "torsoUpper", "torsoLower", "legUpper", "legLower", "foot"] as const;
export type BodyRegion = (typeof BODY_REGIONS)[number];
export type SkinRegion = BodyRegion | "face";

export interface WornItem {
  /** Morph slot, as in SLOT_NAMES. */
  slot: number;
  /** ItemDisplayInfo's GeosetGroup[0..5], each 0 for "no opinion"; missing ones are 0. */
  geosets: number[];
  /** The display's flags retail's geoset builder reads, packed as PAD says. */
  pad?: number;
  body: Partial<Record<BodyRegion, number>>;
  model?: number;
  texture?: number;
  modelRight?: number;
  textureRight?: number;
  /** What a cloak hangs on the back, as a backpack or a quiver. */
  modelBack?: number;
  textureBack?: number;
  /** Models skinned to the body's own bones, as a robe's skirt or a boot's cuff. */
  skinned?: { model: number; texture?: number }[];
  shield?: boolean;
  /** A ranged weapon held in the left hand. */
  bow?: boolean;
  /** Geoset groups this piece removes, as a helm removes hair. */
  hides?: number[];
  /** A model of the piece has no cut for this wearer, so it shows only in part. */
  missing?: boolean;
}

/** ItemDisplayInfo.Flags 0x100000, 0x1000000 and 0x2000000, and which models are "kind 0". */
export const PAD = { keepFoot: 1, chestSleeves: 2, gloveSleeves: 4, kind0: 8, kind1: 16 } as const;

const SLOT = { head: 0, shoulders: 2, shirt: 3, chest: 4, waist: 5, legs: 6, feet: 7, wrists: 8, hands: 9, back: 14, main: 15, off: 16, ranged: 17, tabard: 18 };

/** An HD body's skin: ChrModelMaterial, type 1, on all ten classic races. */
export const SKIN_WIDTH = 2048;
export const SKIN_HEIGHT = 1024;

/** CharComponentTextureSections 9 and 10, which HD gives one texture and the right half. */
const FACE_PANEL: [number, number, number, number] = [SKIN_HEIGHT, 0, SKIN_HEIGHT, SKIN_HEIGHT];

/** The classic 256-unit body map, which an HD body keeps, on the left half. */
const REGION_RECTS: Record<BodyRegion, [number, number, number, number]> = {
  armUpper: [0, 0, 128, 64],
  armLower: [0, 64, 128, 64],
  hand: [0, 128, 128, 32],
  torsoUpper: [128, 0, 128, 64],
  torsoLower: [128, 64, 128, 32],
  legUpper: [128, 96, 128, 64],
  legLower: [128, 160, 128, 64],
  foot: [128, 224, 128, 32],
};

export function regionRect(region: SkinRegion): [number, number, number, number] {
  if (region === "face") return FACE_PANEL;
  const scale = SKIN_HEIGHT / 256;
  return REGION_RECTS[region].map((v) => v * scale) as [number, number, number, number];
}

/** Bottom layer first, so a sleeve goes under a glove and cloth under armour. */
const PAINT_ORDER = [SLOT.shirt, SLOT.legs, SLOT.feet, SLOT.chest, SLOT.tabard, SLOT.waist, SLOT.wrists, SLOT.hands];

const inPaintOrder = (items: WornItem[]) =>
  PAINT_ORDER.flatMap((slot) => items.filter((item) => item.slot === slot));

export function bodyLayers(items: WornItem[]): { region: BodyRegion; file: number }[] {
  return inPaintOrder(items).flatMap((item) =>
    BODY_REGIONS.flatMap((region) => {
      const file = item.body[region];
      return file ? [{ region, file }] : [];
    }),
  );
}

/**
 * Group -> variant on a bare body, for the groups no piece of gear decides. Ears (7)
 * show their second variant, and so does an HD head (32), whose first is a stub; eyes
 * (33) and eyebrows (34) sit in groups of their own.
 */
const BARE: Record<number, number> = { 1: 1, 2: 1, 3: 1, 7: 2, 32: 2, 33: 1, 34: 1 };

/**
 * The groups gear decides, each as [naked, equipped]: what -1 and -2 mean for it.
 * Retail 12.1's own table (the overlay's races/RetailGeo.h, kDefault).
 */
const GEAR_DEFAULTS: Record<number, [number, number]> = {
  4: [1, 1], 5: [0, 1], 8: [1, 1], 9: [0, 1], 10: [1, 1], 11: [0, 1], 12: [1, 1], 13: [0, 1],
  15: [1, 1], 18: [1, 1], 20: [0, 1], 22: [1, 1], 23: [1, 1], 28: [1, 1], 30: [0, 0],
};

/**
 * Retail 12.1's item geosets for an HD body: every group starts at -2, each slot's rule
 * writes its own, in the client's order. Ported from the overlay's races/RetailGeo.h,
 * which is held to retail's own code; `has` is the body model's HasGeoset.
 */
export function gearGroups(items: WornItem[], has: (geoset: number) => boolean): Map<number, number> {
  const bySlot = new Map(items.map((item) => [item.slot, item]));
  const gg = (slot: number, k: number) => bySlot.get(slot)?.geosets[k] ?? 0;
  const pad = (slot: number) => bySlot.get(slot)?.pad ?? 0;
  const worn = (slot: number) => bySlot.has(slot);
  const paints = (slot: number, region: BodyRegion) => Boolean(bySlot.get(slot)?.body[region]);
  const v = new Map<number, number>(Object.keys(GEAR_DEFAULTS).map((g) => [Number(g), -2]));
  let robe = false;
  let shortPants = false;

  // The upper arm, the gloves and the sleeves: one sleeve source.
  if (gg(SLOT.chest, 4)) v.set(28, gg(SLOT.chest, 4) + 1);
  if (gg(SLOT.hands, 0) || pad(SLOT.hands) & PAD.gloveSleeves) {
    if (gg(SLOT.hands, 0)) v.set(4, gg(SLOT.hands, 0) + 1);
    v.set(8, -1);
  } else if (pad(SLOT.chest) & PAD.chestSleeves || gg(SLOT.chest, 0)) {
    v.set(4, -1);
    v.set(8, gg(SLOT.chest, 0) + 1);
  } else if (paints(SLOT.hands, "armLower")) {
    v.set(4, -2);
    v.set(8, -1);
  } else if (paints(SLOT.chest, "armLower")) {
    v.set(4, -1);
    v.set(8, -2);
  } else if (gg(SLOT.shirt, 0)) {
    v.set(4, -1);
    v.set(8, gg(SLOT.shirt, 0) + 1);
  }
  // The hand attachment: the gloves' own value when they ask for one; bracers bring it
  // back over bare forearms.
  if (gg(SLOT.hands, 1)) v.set(23, gg(SLOT.hands, 0));
  const kinds = PAD.kind0 | PAD.kind1;
  if (worn(SLOT.wrists) && pad(SLOT.wrists) & kinds && !gg(SLOT.hands, 0) && !(worn(SLOT.hands) && pad(SLOT.hands) & kinds)) {
    if (gg(SLOT.chest, 0) || pad(SLOT.chest) & PAD.chestSleeves) v.set(23, 1);
    else if (v.get(8) === -1 || v.get(8) === -3) v.set(23, 1);
  }
  // The torso: the chest's fourth value, or a tabard that paints the upper torso.
  const tabardTorso = paints(SLOT.tabard, "torsoUpper") && !(pad(SLOT.tabard) & PAD.keepFoot);
  if (worn(SLOT.chest)) {
    if (tabardTorso) v.set(22, 2);
    else if (gg(SLOT.chest, 3)) v.set(22, gg(SLOT.chest, 3) + 1);
  } else if (tabardTorso) {
    v.set(22, 2);
  }
  // A robe takes the boots, kneepads and pants; else the boots' shaft, else kneepads.
  if (gg(SLOT.chest, 2) || gg(SLOT.legs, 2)) {
    v.set(13, (gg(SLOT.chest, 2) || gg(SLOT.legs, 2)) + 1);
    for (const group of [5, 9, 11, 30]) v.set(group, -1);
    robe = true;
  } else if (gg(SLOT.feet, 0)) {
    v.set(5, gg(SLOT.feet, 0) + 1);
  } else if (gg(SLOT.legs, 1)) {
    v.set(9, gg(SLOT.legs, 1) + 1);
  }
  // The feet, only as a shape the body has.
  if (worn(SLOT.feet) && gg(SLOT.feet, 1)) {
    const g1 = gg(SLOT.feet, 1);
    const foot = g1 >= 2 ? g1 + 1 : robe ? (gg(SLOT.feet, 0) ? 2 : 1) : g1;
    if (has(2000 + foot)) {
      v.set(20, foot);
      // The overlay's one step off retail: the skirt moves only onto a body that has 1303.
      if (robe && foot >= 3 && has(1303)) v.set(13, 3);
    }
  } else if (paints(SLOT.feet, "foot") && !(pad(SLOT.feet) & PAD.keepFoot)) {
    v.set(20, 2);
  }
  // The pants, only as a shape the body has; 1104 and 1105 replace the thighs.
  if (!robe && gg(SLOT.legs, 0)) {
    const p = gg(SLOT.legs, 0);
    if (has(1101 + p)) {
      if (p === 4) {
        if (gg(SLOT.feet, 0) && gg(SLOT.feet, 0) !== 2) v.set(9, gg(SLOT.legs, 1) + 1);
        v.set(13, -1);
      } else if (p === 3) {
        v.set(13, -1);
      } else if (p === 1) {
        shortPants = true;
      }
      v.set(11, p + 1);
    }
  }
  // The tabard; short pants keep the bare 1201.
  if (!robe && gg(SLOT.tabard, 0) && !shortPants) v.set(12, gg(SLOT.tabard, 0) + 1);
  // The undershirt: the chest's, else the shirt's; none under a robe or a shaped tabard.
  if (!gg(SLOT.chest, 2) && !(worn(SLOT.tabard) && gg(SLOT.tabard, 0))) {
    if (gg(SLOT.chest, 1)) v.set(10, gg(SLOT.chest, 1) + 1);
    else if (gg(SLOT.shirt, 1)) v.set(10, gg(SLOT.shirt, 1) + 1);
  }
  if (gg(SLOT.back, 0)) v.set(15, gg(SLOT.back, 0) + 1);
  // The belt; with none, a tabard painting the upper legs drapes as 1804.
  if (gg(SLOT.waist, 0)) v.set(18, gg(SLOT.waist, 0) + 1);
  else if (paints(SLOT.tabard, "legUpper")) v.set(18, 4);

  for (const [group, value] of v) {
    const [naked, equipped] = GEAR_DEFAULTS[group];
    v.set(group, value === -2 ? equipped : value < 0 ? naked : value);
  }
  return v;
}

/** A body with every variant 1..98 of each group, for when the model is not at hand. */
const anyGeoset = (geoset: number) => geoset % 100 > 0 && geoset % 100 < 99;

/** The geoset ids to draw: the body, one hairstyle, and one variant of each group. */
export function visibleGeosets(items: WornItem[], hairstyle: number, has: (geoset: number) => boolean = anyGeoset): Set<number> {
  const variants = new Map([
    ...Object.entries(BARE).map(([group, variant]) => [Number(group), variant] as const),
    ...gearGroups(items, has),
  ]);
  const hidden = new Set(items.flatMap((item) => item.hides ?? []));
  const shown = new Set<number>([0, hidden.has(0) ? 1 : hairstyle]);
  for (const [group, variant] of variants) {
    shown.add(group * 100 + (hidden.has(group) ? 1 : variant));
  }
  return shown;
}

export interface Hung {
  attachment: number;
  model: number;
  texture: number | undefined;
}

const ATTACHMENT = { shield: 0, handRight: 1, handLeft: 2, shoulderRight: 5, shoulderLeft: 6, helm: 11, beltBuckle: 53, backpack: 57 };

/**
 * Where each model of a piece hangs. `worn` is the whole look: a ranged weapon is held
 * as the client's dressing room holds it, a bow in the left hand and the rest in the
 * right, so it has nowhere to go when that hand already holds something.
 */
export function attachmentsFor(item: WornItem, worn: WornItem[] = []): Hung[] {
  const left = (attachment: number): Hung[] => (item.model ? [{ attachment, model: item.model, texture: item.texture }] : []);
  switch (item.slot) {
    case SLOT.head:
      return left(ATTACHMENT.helm);
    case SLOT.shoulders:
      return [
        ...left(ATTACHMENT.shoulderLeft),
        ...(item.modelRight ? [{ attachment: ATTACHMENT.shoulderRight, model: item.modelRight, texture: item.textureRight }] : []),
      ];
    case SLOT.waist:
      return left(ATTACHMENT.beltBuckle);
    case SLOT.back:
      return item.modelBack ? [{ attachment: ATTACHMENT.backpack, model: item.modelBack, texture: item.textureBack }] : [];
    case SLOT.main:
      return left(ATTACHMENT.handRight);
    case SLOT.off:
      return left(item.shield ? ATTACHMENT.shield : ATTACHMENT.handLeft);
    case SLOT.ranged: {
      const hand = item.bow ? SLOT.off : SLOT.main;
      const taken = worn.some((other) => other.slot === hand && other.model);
      return taken ? [] : left(item.bow ? ATTACHMENT.handLeft : ATTACHMENT.handRight);
    }
    default:
      return [];
  }
}
