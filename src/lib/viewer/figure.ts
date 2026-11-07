import type { SlotId } from "@eclipse/format";
import type { Look } from "@/lib/codec/outfit";

/**
 * Between a look code and the 3D engine. Pure, so a test can run it without a page.
 * A code names morph slots (0-18) and item entries; the engine names slots by word
 * and bodies as `<race key>-<male|female>`.
 */

/** morph::Slot -> the engine's slot (Eclipse-Viewer bridge.ts MORPH_SLOT, turned around). */
const SLOT_ID: Readonly<Record<number, SlotId>> = {
  0: "head", 2: "shoulder", 3: "shirt", 4: "chest", 5: "waist", 6: "legs", 7: "feet", 8: "wrist", 9: "hands",
  14: "back", 15: "mainhand", 16: "offhand", 17: "ranged", 18: "tabard",
};

export const slotIdOf = (slot: number): SlotId | null => SLOT_ID[slot] ?? null;

/** ChrRaces ids of a classic `look` line. The engine draws the retail body of the same race. */
const CLASSIC_RACE: Readonly<Record<number, string>> = {
  1: "human", 2: "orc", 3: "dwarf", 4: "nightelf", 5: "undead", 6: "tauren", 7: "gnome", 8: "troll", 9: "goblin", 10: "bloodelf", 11: "draenei",
};

/** Who wears the look: a classic ChrRaces id, or a retail race key from an `rlook` line. */
export interface Wearer {
  race: number | string;
  /** 0 male, 1 female. */
  gender: number;
  /** The whole `rlook` line, when there is one: it carries the face, hair and the rest. */
  line?: string;
}

/** The wearer a code's look line asks for. Null: the code leaves the body alone. */
export function wearerOf(look: Look | null | undefined): Wearer | null {
  if (!look) return null;
  if (look.kind === "rlook") return { race: look.race, gender: look.sex === "f" ? 1 : 0, line: look.line };
  return { race: look.race, gender: look.gender };
}

/** "Your own race" and races the engine has no body for: a human stands in. */
const STAND_IN = "human";

export function bodyOf(wearer: Wearer | null): string {
  const key = typeof wearer?.race === "string" ? wearer.race : CLASSIC_RACE[wearer?.race ?? -1] ?? STAND_IN;
  return `${key}-${wearer?.gender ? "female" : "male"}`;
}

/** races::Serialize's `<option>:<choice>` pairs as the engine reads them: `<option>.<choice>,...`. */
export function lookTextOf(line: string | undefined): string | undefined {
  const pairs = [...(line ?? "").matchAll(/(\d+):(\d+)/g)].map((m) => `${m[1]}.${m[2]}`);
  return pairs.length ? pairs.join(",") : undefined;
}

/** What the figure draws: slot and item entry, for every visible slot holding an item. */
export function wornOf(pieces: Record<number, number>): [SlotId, number][] {
  return Object.entries(pieces).flatMap(([slot, entry]) => {
    const id = slotIdOf(Number(slot));
    return id && entry ? [[id, entry] as [SlotId, number]] : [];
  });
}
