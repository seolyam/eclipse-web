import type { ItemHit, ResolvedOutfit } from "@/lib/catalog";
import { emptyOutfit, encodeOutfit, type Outfit } from "@/lib/codec/outfit";
import { RACE_BY_ID, VISIBLE_SLOTS } from "@/lib/domain";

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

/** What a published look puts on the rack: slot -> item, where null hides the slot. */
export interface StartingRack {
  pieces: Record<number, ItemHit | null>;
  look: DressingLook | null;
}

/**
 * A published look, opened in the Dressing room. It keeps the visible slots and a
 * client race; mounts, morphs and enchants have no place on the rack.
 */
export function startingRack(outfit: Outfit, resolved: ResolvedOutfit): StartingRack {
  const visible = new Set<number>(VISIBLE_SLOTS);
  const pieces: Record<number, ItemHit | null> = {};
  for (const s of resolved.slots) {
    if (!visible.has(s.slot)) continue;
    pieces[s.slot] = s.item === 0 ? null : { id: s.item, name: s.name ?? `Item ${s.item}`, icon: s.icon, quality: s.quality };
  }
  const l = outfit.look;
  const look = l?.kind === "look" && RACE_BY_ID[l.race] ? { race: l.race, gender: l.gender } : null;
  return { pieces, look };
}
