import { createSearchParamsCache, parseAsInteger, parseAsString, parseAsStringLiteral } from "nuqs/server";
import {
  ARMOR_TYPES, CATEGORIES, CLASSES, RACE_LABEL, SORTS, WORLD_GROUPS, WORLD_LOOK_NAMES,
} from "@/lib/domain";

export const wardrobeParsers = {
  q: parseAsString.withDefault(""),
  class: parseAsStringLiteral(CLASSES),
  race: parseAsStringLiteral(Object.keys(RACE_LABEL)),
  armor: parseAsStringLiteral(ARMOR_TYPES),
  category: parseAsStringLiteral(CATEGORIES),
  tag: parseAsString,
  sort: parseAsStringLiteral(SORTS).withDefault("trending"),
  page: parseAsInteger.withDefault(1),
};
export const wardrobeCache = createSearchParamsCache(wardrobeParsers);

export const worldParsers = {
  group: parseAsStringLiteral(WORLD_GROUPS),
  look: parseAsStringLiteral(WORLD_LOOK_NAMES),
};
export const worldCache = createSearchParamsCache(worldParsers);
