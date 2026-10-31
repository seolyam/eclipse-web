import "server-only";
import enchantsJson from "@/data/catalog/enchants.json";
import itemsJson from "@/data/catalog/items.json";
import mountsJson from "@/data/catalog/mounts.json";
import placesJson from "@/data/catalog/places.json";
import qualityJson from "@/data/catalog/quality.json";
import { COLOUR_AXES, RACE_BY_ID, RACE_LABEL, SLOT_NAMES, VISIBLE_SLOTS, WORLD_GROUPS, type WorldGroup } from "@/lib/domain";
import type { Outfit } from "@/lib/codec/outfit";
import type { WorldPlace } from "@/lib/codec/world";

// tools/export_catalog.py writes these from the Eclipse data. Numbers in a code
// mean nothing without them: the code holds ids, the names live here.
type ItemRow = [id: number, name: string, invType: number, armor: number, icon: string];
type MountRow = [display: number, name: string, icon: string];
type PlaceRow = [tag: string, name: string, parent: number, group: number];

const itemById = new Map((itemsJson as ItemRow[]).map((r) => [r[0], r]));
const mountById = new Map((mountsJson as MountRow[]).map((r) => [r[0], r]));
const placeRows = placesJson.rows as PlaceRow[];
// Quality and enchant names are sparse: a miss means unknown, never zero.
const qualityById = qualityJson as Record<string, number>;
const enchantById = enchantsJson as Record<string, string>;
const placeByTag = new Map(placeRows.map((r, i) => [r[0], { row: r, index: i }]));

export const catalogCounts = {
  items: itemById.size,
  mounts: mountById.size,
  places: placeRows.length,
  races: Object.keys(RACE_LABEL).length,
};

export function itemIcon(id: number): string | null {
  return itemById.get(id)?.[4] || null;
}

export interface PlaceInfo {
  tag: string;
  name: string;
  path: string;
  group: WorldGroup;
}

function placeInfo(tag: string): PlaceInfo | null {
  const hit = placeByTag.get(tag);
  if (!hit) return null;
  const path: string[] = [];
  for (let p = hit.row[2]; p >= 0; p = placeRows[p][2]) path.push(placeRows[p][1]);
  return { tag, name: hit.row[1], path: path.join(" · "), group: WORLD_GROUPS[hit.row[3]] };
}

export const resolvePlace = placeInfo;

export function placeTagByName(name: string): string | null {
  const row = placeRows.find((r) => r[1] === name);
  return row ? row[0] : null;
}

export function searchPlaces(query: string, limit = 12): PlaceInfo[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const hits: PlaceInfo[] = [];
  for (const row of placeRows) {
    if (row[1].toLowerCase().includes(q)) {
      const info = placeInfo(row[0]);
      if (info) hits.push(info);
    }
    if (hits.length >= limit) break;
  }
  return hits;
}

export interface ResolvedSlot {
  slot: number;
  label: string;
  /** 0 when the code hides the slot on purpose. */
  item: number;
  name: string | null;
  icon: string | null;
  /** 0 poor .. 7 heirloom, or null when no source names it. */
  quality: number | null;
}

export interface ResolvedMount {
  id: number;
  name: string | null;
  icon: string | null;
}

export interface ResolvedOutfit {
  slots: ResolvedSlot[];
  race: string | null;
  /** The key of RACE_LABEL, for the race's art. Null for a stored race id the site has no key for. */
  raceKey: string | null;
  sex: "Male" | "Female" | null;
  morph: number | null;
  morphName: string | null;
  mount: ResolvedMount | null;
  mountFly: ResolvedMount | null;
  mountHidden: boolean;
  glows: { hand: "Main Hand" | "Off Hand"; id: number; name: string | null; colour: string | null }[];
  sheathe: { hand: "Main Hand" | "Off Hand"; position: number }[];
  scale: number | null;
  colours: { axis: string; hex: string }[];
  tints: number;
  cosmetics: number;
  unknown: string[];
}

const mount = (id: number): ResolvedMount | null => {
  if (!id) return null;
  const row = mountById.get(id);
  return { id, name: row?.[1] ?? null, icon: row?.[2] || null };
};

const hexColour = (v: number) => `#${v.toString(16).padStart(6, "0").toUpperCase()}`;
const HANDS = ["Main Hand", "Off Hand"] as const;

export function resolveOutfit(o: Outfit): ResolvedOutfit {
  const order = new Map<number, number>(VISIBLE_SLOTS.map((s, i) => [s, i]));
  const slots = Object.entries(o.slots)
    .map(([key, item]) => {
      const slot = Number(key);
      const row = itemById.get(item);
      return {
        slot,
        label: SLOT_NAMES[slot],
        item,
        name: row?.[1] ?? null,
        icon: row?.[4] || null,
        quality: qualityById[item] ?? null,
      };
    })
    .sort((a, b) => (order.get(a.slot) ?? 99) - (order.get(b.slot) ?? 99));

  let race: string | null = null;
  let raceKey: string | null = null;
  let sex: ResolvedOutfit["sex"] = null;
  if (o.look?.kind === "rlook") {
    race = RACE_LABEL[o.look.race] ?? o.look.race;
    raceKey = RACE_LABEL[o.look.race] ? o.look.race : null;
    sex = o.look.sex === "f" ? "Female" : "Male";
  } else if (o.look) {
    race = RACE_LABEL[RACE_BY_ID[o.look.race]] ?? `Race ${o.look.race}`;
    raceKey = RACE_BY_ID[o.look.race] ?? null;
    sex = o.look.gender ? "Female" : "Male";
  }

  return {
    slots,
    race,
    raceKey,
    sex,
    morph: o.display || null,
    morphName: mountById.get(o.display)?.[1] ?? null,
    mount: mount(o.mount),
    mountFly: mount(o.mountFly),
    mountHidden: o.mountHidden,
    glows: o.glow.flatMap((g, i) =>
      g ? [{ hand: HANDS[i], id: g.id, name: enchantById[g.id] ?? null, colour: g.tint ? hexColour(g.colour) : null }] : [],
    ),
    sheathe: o.sheathe.flatMap((position, i) => (position ? [{ hand: HANDS[i], position }] : [])),
    scale: o.scale || null,
    colours: o.colors.map((c) => ({ axis: COLOUR_AXES[c.axis], hex: hexColour(c.rgb) })),
    tints: o.wtint.length + o.mtint.length,
    cosmetics: o.cosmetics.length,
    unknown: o.unknown,
  };
}

export interface ResolvedWorldPlace extends WorldPlace {
  info: PlaceInfo | null;
}

export const resolveWorld = (places: WorldPlace[]): ResolvedWorldPlace[] =>
  places.map((p) => ({ ...p, info: placeInfo(p.tag) }));
