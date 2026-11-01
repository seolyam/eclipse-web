import { emptyOutfit, encodeOutfit } from "@/lib/codec/outfit";

/** A client race and sex. Retail races are out: an rlook line needs real choice ids. */
export interface DressingLook {
  /** A key of RACE_BY_ID. */
  race: number;
  /** 0 male, 1 female. */
  gender: number;
}

/**
 * The loadout code for what is on the rack: slot -> item, where 0 hides the slot.
 * Null until something is chosen, because an empty code would dress nobody.
 *
 * Appearance stays at 0: the game moves whatever a race cannot draw (cc::Sanitise).
 */
export function dressedCode(slots: Record<number, number>, look: DressingLook | null): string | null {
  if (!look && !Object.keys(slots).length) return null;
  const outfit = emptyOutfit();
  outfit.slots = slots;
  if (look) outfit.look = { kind: "look", ...look, skin: 0, face: 0, hairStyle: 0, hairColour: 0, facialHair: 0 };
  return encodeOutfit(outfit);
}
