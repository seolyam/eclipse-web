import { createParser, createSearchParamsCache, parseAsInteger, parseAsString, parseAsStringLiteral } from "nuqs/server";
import {
  ARMOR_TYPES, CATEGORIES, CLASSES, RACE_LABEL, SORTS, WORLD_GROUPS, WORLD_LOOK_NAMES,
} from "@/lib/domain";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// An author comes from a shareable link, and Postgres rejects a malformed uuid.
const parseAsAccountId = createParser({
  parse: (value) => (UUID.test(value) ? value : null),
  serialize: (value: string) => value,
});

export const wardrobeParsers = {
  q: parseAsString.withDefault(""),
  class: parseAsStringLiteral(CLASSES),
  race: parseAsStringLiteral(Object.keys(RACE_LABEL)),
  armor: parseAsStringLiteral(ARMOR_TYPES),
  category: parseAsStringLiteral(CATEGORIES),
  tag: parseAsString,
  author: parseAsAccountId,
  sort: parseAsStringLiteral(SORTS).withDefault("trending"),
  page: parseAsInteger.withDefault(1),
};
export const wardrobeCache = createSearchParamsCache(wardrobeParsers);

export const worldParsers = {
  group: parseAsStringLiteral(WORLD_GROUPS),
  look: parseAsStringLiteral(WORLD_LOOK_NAMES),
};
export const worldCache = createSearchParamsCache(worldParsers);
