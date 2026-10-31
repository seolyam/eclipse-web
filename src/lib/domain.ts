// The game's vocabulary. Slots are MorphOffsets.h, races are
// tools/races/races_matrix.py plus the client's own ChrRaces ids.

export const SLOT_NAMES = [
  "Head", "Neck", "Shoulders", "Shirt", "Chest", "Waist", "Legs", "Feet",
  "Wrists", "Hands", "Ring 1", "Ring 2", "Trinket 1", "Trinket 2", "Back",
  "Main Hand", "Off Hand", "Ranged", "Tabard",
] as const;

/** morph::SlotIsVisual, in the order a person reads a character. */
export const VISIBLE_SLOTS = [0, 2, 14, 4, 3, 18, 8, 9, 5, 6, 7, 15, 16, 17] as const;

export const SHEATHE_NAMES = ["Natural", "Back", "Hip", "Hidden"] as const;

export const CLASSES = [
  "Death Knight", "Druid", "Hunter", "Mage", "Paladin",
  "Priest", "Rogue", "Shaman", "Warlock", "Warrior",
] as const;
export type ClassName = (typeof CLASSES)[number];

export const ARMOR_TYPES = ["cloth", "leather", "mail", "plate"] as const;
export type ArmorType = (typeof ARMOR_TYPES)[number];

export const ARMOR_LABEL: Record<ArmorType, string> = {
  cloth: "Cloth", leather: "Leather", mail: "Mail", plate: "Plate",
};

export const ARMOR_CLASSES: Record<ArmorType, readonly ClassName[]> = {
  cloth: ["Mage", "Priest", "Warlock"],
  leather: ["Druid", "Rogue"],
  mail: ["Hunter", "Shaman"],
  plate: ["Death Knight", "Paladin", "Warrior"],
};

// What a post is about, chosen by its author. Retail and PvP looks are Armor with
// a tag. World presets are ECW1 codes with a route of their own, so they are a
// stop in the filter row and not a value a loadout can hold.
export const CATEGORIES = ["Armor", "Race morph", "Creature morph", "Incarnations", "Spell visuals", "3D effects"] as const;
export type Category = (typeof CATEGORIES)[number];
export const WORLD_PRESETS_CATEGORY = "World presets";

export const SORTS = ["trending", "newest", "top"] as const;
export type Sort = (typeof SORTS)[number];

export const SORT_LABEL: Record<Sort, string> = {
  trending: "Trending", newest: "Newest", top: "Top rated",
};

export const LOOKS_PER_PAGE = 24;

export const RACE_LABEL: Record<string, string> = {
  human: "Human", orc: "Orc", dwarf: "Dwarf", nightelf: "Night Elf", undead: "Forsaken",
  tauren: "Tauren", gnome: "Gnome", troll: "Troll", goblin: "Goblin", bloodelf: "Blood Elf",
  draenei: "Draenei", worgen: "Worgen", gilnean: "Worgen (Gilnean)", pandaren: "Pandaren",
  nightborne: "Nightborne", highmountain: "Highmountain Tauren", voidelf: "Void Elf",
  lightforged: "Lightforged Draenei", zandalari: "Zandalari Troll", kultiran: "Kul Tiran",
  darkiron: "Dark Iron Dwarf", vulpera: "Vulpera", maghar: "Mag'har Orc", mechagnome: "Mechagnome",
  dracthyr: "Dracthyr", visage: "Dracthyr (Visage)", earthen: "Earthen", haranir: "Haranir",
  orcupright: "Orc (upright)", magharupright: "Mag'har (upright)",
};

/** A stored `look` line's race byte, the client's ChrRaces id. */
export const RACE_BY_ID: Record<number, string> = {
  1: "human", 2: "orc", 3: "dwarf", 4: "nightelf", 5: "undead",
  6: "tauren", 7: "gnome", 8: "troll", 10: "bloodelf", 11: "draenei",
};

export const COLOUR_AXES = ["Skin", "Hair", "Eyes", "Death knight eyes", "Tattoo"] as const;

export const WORLD_GROUPS = ["Classic", "Burning Crusade", "Wrath", "Capitals", "Instances", "Other"] as const;
export type WorldGroup = (typeof WORLD_GROUPS)[number];

/** What a player needs to remember: UiColorWorld.cpp kLooks, row by row. */
export const WORLD_LOOKS = {
  Autumn: { ground: [0.8, 0.45, 0.18, 0.35], buildings: [0.78, 0.52, 0.3, 0.3], objects: [1, 0.62, 0.3, 1], grass: [0.95, 0.55, 0.15, 0.45] },
  Winter: { ground: [0.8, 0.9, 1, 0.4], buildings: [0.85, 0.92, 1, 0.3], objects: [0.8, 0.9, 1, 1], grass: [0.9, 0.95, 1, 0.5] },
  Twilight: { ground: [0.45, 0.3, 0.85, 0.35], buildings: [0.55, 0.4, 0.9, 0.3], objects: [0.65, 0.5, 1, 1], grass: [0.5, 0.35, 0.95, 0.45] },
  Fel: { ground: [0.35, 0.9, 0.2, 0.35], buildings: [0.4, 0.85, 0.25, 0.3], objects: [0.5, 1, 0.3, 1], grass: [0.4, 1, 0.2, 0.45] },
  Blood: { ground: [0.85, 0.12, 0.1, 0.35], buildings: [0.75, 0.15, 0.12, 0.3], objects: [1, 0.25, 0.2, 1], grass: [0.9, 0.15, 0.1, 0.45] },
  Gilded: { ground: [1, 0.8, 0.35, 0.35], buildings: [1, 0.85, 0.45, 0.3], objects: [1, 0.88, 0.5, 1], grass: [1, 0.82, 0.3, 0.45] },
  Ghostly: { ground: [0.55, 0.7, 0.8, 0.4], buildings: [0.6, 0.72, 0.82, 0.35], objects: [0.7, 0.85, 0.95, 1], grass: [0.6, 0.8, 0.9, 0.5] },
} as const satisfies Record<string, Record<"ground" | "buildings" | "objects" | "grass", readonly [number, number, number, number]>>;
export type WorldLookName = keyof typeof WORLD_LOOKS;
export const WORLD_LOOK_NAMES = Object.keys(WORLD_LOOKS) as WorldLookName[];

export const toCss = ([r, g, b]: readonly number[]) =>
  `rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)})`;
