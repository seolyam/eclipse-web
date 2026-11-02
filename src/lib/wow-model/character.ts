// How a piece of gear changes a character. Three things happen: textures paint onto
// the body's skin, geosets swap (a bare hand for a glove), and models hang off
// attachment points (a helm on the head). Rules: wow.export (MIT) and the 3.3.5a client.

export const BODY_REGIONS = ["armUpper", "armLower", "hand", "torsoUpper", "torsoLower", "legUpper", "legLower", "foot"] as const;
export type BodyRegion = (typeof BODY_REGIONS)[number];
export type SkinRegion = BodyRegion | "face";

export interface WornItem {
  /** Morph slot, as in SLOT_NAMES. */
  slot: number;
  /** ItemDisplayInfo's geoset groups, each 0 for "no opinion". */
  geosets: [number, number, number];
  body: Partial<Record<BodyRegion, number>>;
  model?: number;
  texture?: number;
  modelRight?: number;
  textureRight?: number;
  shield?: boolean;
  /** A ranged weapon held in the left hand. */
  bow?: boolean;
  /** Geoset groups this piece removes, as a helm removes hair. */
  hides?: number[];
}

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

// The geoset group each of an item's three numbers drives, by slot.
const GEOSET_GROUPS: Record<number, readonly number[]> = {
  [SLOT.shirt]: [8, 10],
  [SLOT.chest]: [8, 10, 13],
  [SLOT.waist]: [18],
  [SLOT.legs]: [11, 9, 13],
  [SLOT.feet]: [5, 20],
  [SLOT.hands]: [4, 23],
  [SLOT.back]: [15],
  [SLOT.tabard]: [12],
};

/**
 * Group -> variant on a bare body. Variant 1 is "nothing"; ears are the exception, and
 * so is an HD head (32), whose first variant is a stub. An HD body also keeps its feet
 * (20), chest (22), eyes (33) and eyebrows (34) out of geoset 0, and elves their hands
 * (23). A race without one of these has that part in geoset 0.
 */
const BARE: Record<number, number> = {
  1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 7: 2, 8: 1, 9: 1, 10: 1, 11: 1, 12: 1, 13: 1, 15: 1, 18: 1, 20: 1, 22: 1, 23: 1, 32: 2, 33: 1, 34: 1,
};

/** The geoset ids to draw: the body, one hairstyle, and one variant of each group. */
export function visibleGeosets(items: WornItem[], hairstyle: number): Set<number> {
  const variants = new Map(Object.entries(BARE).map(([group, variant]) => [Number(group), variant]));
  for (const item of inPaintOrder(items).concat(items.filter((i) => i.slot === SLOT.back))) {
    GEOSET_GROUPS[item.slot]?.forEach((group, i) => {
      // 0 is "no opinion", and must not undo a robe's skirt set by another piece.
      if (item.geosets[i]) variants.set(group, 1 + item.geosets[i]);
    });
  }

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

const ATTACHMENT = { shield: 0, handRight: 1, handLeft: 2, shoulderRight: 5, shoulderLeft: 6, helm: 11 };

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
