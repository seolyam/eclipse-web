import { describe, expect, it, vi } from "vitest";
import itemsJson from "@/data/catalog/items.json";
import qualityJson from "@/data/catalog/quality.json";

vi.mock("server-only", () => ({}));

import { searchItems } from "./catalog";

type Row = [id: number, name: string, invType: number, armor: number, icon: string];
const rows = itemsJson as Row[];
const invTypeOf = new Map(rows.map((r) => [r[0], r[2]]));
const firstOf = (invType: number) => rows.find((r) => r[2] === invType)!;
const SLOT = { head: 0, neck: 1, chest: 4, mainHand: 15, offHand: 16, ranged: 17 };

// The hands are what Dressing.h's kHome is really for: type 13 is the only row with
// a second home, and the catalogue exporter's own table lists only the first.
describe("the items a slot can wear", () => {
  it("offers a slot only its own item types", () => {
    const hits = searchItems("", SLOT.head, 200);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((h) => invTypeOf.get(h.id) === 1)).toBe(true);
  });

  it("offers a one-hander in either hand", () => {
    const [id, name] = firstOf(13);
    expect(searchItems(name, SLOT.mainHand, 200).map((h) => h.id)).toContain(id);
    expect(searchItems(name, SLOT.offHand, 200).map((h) => h.id)).toContain(id);
  });

  it("keeps a two-hander out of the off hand and a shield out of the main hand", () => {
    const [twoHander, twoHanderName] = firstOf(17);
    const [shield, shieldName] = firstOf(14);
    expect(searchItems(twoHanderName, SLOT.offHand, 200).map((h) => h.id)).not.toContain(twoHander);
    expect(searchItems(shieldName, SLOT.mainHand, 200).map((h) => h.id)).not.toContain(shield);
  });

  it("files robes with chests, and thrown weapons and relics with ranged", () => {
    expect(searchItems(firstOf(20)[1], SLOT.chest, 200).map((h) => h.id)).toContain(firstOf(20)[0]);
    expect(searchItems(firstOf(25)[1], SLOT.ranged, 200).map((h) => h.id)).toContain(firstOf(25)[0]);
    expect(searchItems(firstOf(28)[1], SLOT.ranged, 200).map((h) => h.id)).toContain(firstOf(28)[0]);
  });

  it("offers nothing for a slot that shows nothing on a character", () => {
    expect(searchItems("", SLOT.neck)).toEqual([]);
    expect(searchItems("", 99)).toEqual([]);
  });
});

describe("searching the items", () => {
  it("ignores case and stops at the limit", () => {
    const [, name] = firstOf(1);
    expect(searchItems(name.toUpperCase(), SLOT.head).some((h) => h.name === name)).toBe(true);
    expect(searchItems("", SLOT.head, 5)).toHaveLength(5);
  });

  it("finds nothing for a name no item has", () => {
    expect(searchItems("zz no such item zz", SLOT.head)).toEqual([]);
  });

  it("says when it knows an item's quality and never guesses", () => {
    const known = Object.keys(qualityJson as Record<string, number>).map(Number).find((id) => invTypeOf.get(id) === 1);
    if (known) {
      const name = rows.find((r) => r[0] === known)![1];
      const hit = searchItems(name, SLOT.head, 200).find((h) => h.id === known);
      expect(hit?.quality).toBe((qualityJson as Record<string, number>)[String(known)]);
    }
    const unknown = rows.find((r) => r[2] === 1 && !(String(r[0]) in qualityJson))!;
    expect(searchItems(unknown[1], SLOT.head, 200).find((h) => h.id === unknown[0])?.quality).toBeNull();
  });

  it("leaves an item with no icon to the slot's own texture", () => {
    const bare = rows.find((r) => r[2] === 1 && !r[4]);
    if (bare) expect(searchItems(bare[1], SLOT.head, 200).find((h) => h.id === bare[0])?.icon).toBeNull();
  });
});
