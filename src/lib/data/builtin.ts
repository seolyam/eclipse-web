import "server-only";
import setsJson from "@/data/catalog/sets.json";
import { itemIcon, placeTagByName, resolvePlace } from "@/lib/catalog";
import { emptyOutfit, encodeOutfit } from "@/lib/codec/outfit";
import { encodeLook } from "@/lib/codec/world";
import {
  ARMOR_CLASSES, ARMOR_TYPES, LOOKS_PER_PAGE, WORLD_LOOKS, type ArmorType, type WorldLookName,
} from "@/lib/domain";
import type { OutfitFilters, OutfitPost, Repository, WorldFilters, WorldPreset } from "./types";

// What the site can show with no database, and every word of it is real: the
// game's own item sets, the one saved look in the Eclipse repo, and the overlay's
// world looks on real places. Nobody published these, so they carry no author,
// votes or date, and nothing here is dressed up with a race, mount or enchant the
// set does not hold. Writes are refused rather than pretended.

interface SetRow {
  id: number;
  name: string;
  armor: ArmorType;
  pieces: Record<string, number>;
}

const NOT_LIVE = "Publishing is not open yet: the community database is not connected.";

// A set with an icon on most of its pieces, so a card can show what it is.
function usableSets(armor: ArmorType): SetRow[] {
  return (setsJson as unknown as SetRow[]).filter((s) => {
    if (s.armor !== armor) return false;
    const items = Object.values(s.pieces);
    return items.length >= 6 && items.filter(itemIcon).length >= items.length - 1;
  });
}

function setLook(set: SetRow): OutfitPost {
  const outfit = emptyOutfit();
  for (const [slot, item] of Object.entries(set.pieces)) outfit.slots[Number(slot)] = item;
  return {
    id: `set-${set.id}`,
    title: set.name,
    author: null,
    authorId: null,
    authorVerified: false,
    code: encodeOutfit(outfit),
    className: null,
    armor: set.armor,
    race: null,
    category: "Armor",
    tags: [
      ...(/gladiator/i.test(set.name) ? ["pvp"] : []),
      ...(Object.values(set.pieces).some((i) => i > 200000) ? ["retail"] : []),
    ],
    upvotes: null,
    createdAt: null,
    gallery: [],
  };
}

// The one real saved look (overlay profiles/morph.cfg), slot for slot.
function crystalScholar(): OutfitPost {
  const outfit = emptyOutfit();
  outfit.slots = { 0: 259306, 2: 1001733, 4: 1001735, 5: 1001729, 6: 1001732, 8: 1001736, 9: 1001731, 14: 1001728 };
  outfit.mount = 134653;
  return {
    id: "crystal-scholar",
    title: "Crystal Scholar on a yellow ottuk",
    author: "Eclipse",
    authorId: null,
    authorVerified: false,
    code: encodeOutfit(outfit),
    className: null,
    armor: "cloth",
    race: null,
    category: "Armor",
    tags: ["saved look", "retail", "mount"],
    upvotes: null,
    createdAt: null,
    gallery: [],
  };
}

// One of each armor type in turn, so a first page is not all cloth.
function interleaved(lists: SetRow[][]): SetRow[] {
  const longest = Math.max(...lists.map((l) => l.length));
  return Array.from({ length: longest }, (_, i) => lists.flatMap((l) => (i < l.length ? [l[i]] : []))).flat();
}

let looks: OutfitPost[] | null = null;
function allLooks(): OutfitPost[] {
  looks ??= [crystalScholar(), ...interleaved(ARMOR_TYPES.map(usableSets)).map(setLook)];
  return looks;
}

// Nobody chose a class for a set, but its armor says who wears it.
function wornBy(o: OutfitPost, className: NonNullable<OutfitFilters["className"]>): boolean {
  if (o.className) return o.className === className;
  return o.armor !== null && ARMOR_CLASSES[o.armor].includes(className);
}

function matches(o: OutfitPost, f: OutfitFilters): boolean {
  if (f.captured && !o.gallery.length) return false;
  if (f.authorId && o.authorId !== f.authorId) return false;
  if (f.className && !wornBy(o, f.className)) return false;
  if (f.race && o.race !== f.race) return false;
  if (f.armor && o.armor !== f.armor) return false;
  if (f.category && o.category !== f.category) return false;
  if (f.tag && !o.tags.includes(f.tag)) return false;
  if (f.q) {
    const q = f.q.toLowerCase();
    return [o.title, ...o.tags].some((t) => t.toLowerCase().includes(q));
  }
  return true;
}

// The overlay's looks (UiColorWorld.cpp kLooks) on places from the catalogue.
const PRESETS: { look: WorldLookName; places: string[] }[] = [
  { look: "Autumn", places: ["Elwynn Forest"] },
  { look: "Winter", places: ["Dun Morogh"] },
  { look: "Twilight", places: ["Duskwood"] },
  { look: "Fel", places: ["Hellfire Peninsula"] },
  { look: "Blood", places: ["Icecrown Citadel"] },
  { look: "Gilded", places: ["Stormwind City", "Orgrimmar"] },
  { look: "Ghostly", places: ["Eastern Plaguelands"] },
  { look: "Twilight", places: ["Dalaran"] },
  { look: "Winter", places: ["The Storm Peaks"] },
  { look: "Autumn", places: ["Teldrassil"] },
  { look: "Fel", places: ["Felwood"] },
  { look: "Gilded", places: ["Silvermoon City"] },
];

let presets: WorldPreset[] | null = null;
function allPresets(): WorldPreset[] {
  presets ??= PRESETS.map((p, i) => {
    const tags = p.places.map((name) => {
      const tag = placeTagByName(name);
      if (!tag) throw new Error(`no such place in the catalogue: ${name}`);
      return tag;
    });
    return {
      id: `w${i + 1}`,
      title: p.look,
      look: p.look,
      blurb: "",
      code: encodeLook(tags, WORLD_LOOKS[p.look]),
      places: tags,
      group: resolvePlace(tags[0])?.group ?? "Other",
      author: null,
    };
  });
  return presets;
}

export const builtinRepository: Repository = {
  live: false,
  async listOutfits(f) {
    const hits = allLooks().filter((o) => matches(o, f));
    const size = f.pageSize ?? LOOKS_PER_PAGE;
    const start = (Math.max(1, f.page ?? 1) - 1) * size;
    return { posts: hits.slice(start, start + size), total: hits.length };
  },
  async getOutfit(id) {
    return allLooks().find((o) => o.id === id) ?? null;
  },
  async searchIndex() {
    return allLooks().map(({ id, title, author }) => ({ id, title, author }));
  },
  async createOutfit() {
    return { ok: false, error: NOT_LIVE };
  },
  async upvote() {
    return { ok: false, error: NOT_LIVE };
  },
  async uploadScreenshot() {
    return { ok: false, error: NOT_LIVE };
  },
  async removeScreenshot() {
    return { ok: false, error: NOT_LIVE };
  },
  async deleteOutfit() {
    return { ok: false, error: NOT_LIVE };
  },
  async getAccount() {
    return null;
  },
  async setDisplayName() {
    return { ok: false, error: NOT_LIVE };
  },
  async listWorldPresets(f: WorldFilters) {
    return allPresets().filter(
      (p) => (!f.group || p.group === f.group) && (!f.look || p.look === f.look),
    );
  },
};
