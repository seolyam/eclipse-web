// How a piece of gear changes a character. Three things happen: textures paint onto
// the body's skin, geosets swap (a bare hand for a glove), and models hang off
// attachment points (a helm on the head). Rules: wow.export (MIT) and the 3.3.5a client.

export const BODY_REGIONS = ["armUpper", "armLower", "hand", "torsoUpper", "torsoLower", "legUpper", "legLower", "foot"] as const;
export type BodyRegion = (typeof BODY_REGIONS)[number];
export type SkinRegion = BodyRegion | "faceUpper" | "faceLower";

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
  /** Geoset groups this piece removes, as a helm removes hair. */
  hides?: number[];
}

const SLOT = { head: 0, shoulders: 2, shirt: 3, chest: 4, waist: 5, legs: 6, feet: 7, wrists: 8, hands: 9, back: 14, main: 15, off: 16, ranged: 17, tabard: 18 };

export const SKIN_SIZE = 1024;

/** The classic 256-unit skin map. Retail's textures are this at four times the size. */
const REGION_RECTS: Record<SkinRegion, [number, number, number, number]> = {
  armUpper: [0, 0, 128, 64],
  armLower: [0, 64, 128, 64],
  hand: [0, 128, 128, 32],
  faceUpper: [0, 160, 128, 32],
  faceLower: [0, 192, 128, 64],
  torsoUpper: [128, 0, 128, 64],
  torsoLower: [128, 64, 128, 32],
  legUpper: [128, 96, 128, 64],
  legLower: [128, 160, 128, 64],
  foot: [128, 224, 128, 32],
};

export function regionRect(region: SkinRegion): [number, number, number, number] {
  const scale = SKIN_SIZE / 256;
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

/** Group -> variant on a bare body. Variant 1 is "nothing"; ears are the exception. */
const BARE: Record<number, number> = { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 7: 2, 8: 1, 9: 1, 10: 1, 11: 1, 12: 1, 13: 1, 15: 1, 18: 1 };

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
  /** Used on a body without the first point. */
  fallback?: number;
  model: number;
  texture: number | undefined;
}

const ATTACHMENT = { shield: 0, handRight: 1, handLeft: 2, shoulderRight: 5, shoulderLeft: 6, neck: 11, sheath: 26, headTop: 55 };

export function attachmentsFor(item: WornItem): Hung[] {
  const left = (attachment: number): Hung[] => (item.model ? [{ attachment, model: item.model, texture: item.texture }] : []);
  switch (item.slot) {
    case SLOT.head:
      return left(ATTACHMENT.headTop).map((hung) => ({ ...hung, fallback: ATTACHMENT.neck }));
    case SLOT.shoulders:
      return [
        ...left(ATTACHMENT.shoulderLeft),
        ...(item.modelRight ? [{ attachment: ATTACHMENT.shoulderRight, model: item.modelRight, texture: item.textureRight }] : []),
      ];
    case SLOT.main:
      return left(ATTACHMENT.handRight);
    case SLOT.off:
      return left(item.shield ? ATTACHMENT.shield : ATTACHMENT.handLeft);
    case SLOT.ranged:
      return left(ATTACHMENT.sheath);
    default:
      return [];
  }
}
