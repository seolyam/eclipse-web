import { describe, expect, it } from "vitest";
import { CATEGORIES, WORLD_PRESETS_CATEGORY } from "@/lib/domain";
import { FEATURES } from "./features";

describe("the overlay's feature grid", () => {
  it("keeps the official page's sixteen features, in order", () => {
    expect(FEATURES.map((f) => f.title)).toEqual([
      "Wardrobe", "Customization", "Mounts", "Creature morph", "Enchants", "Incarnations",
      "Spell visuals", "Procs", "Optimize", "Titles", "Effects", "Colour", "World", "Font",
      "Loadouts", "Multiplayer",
    ]);
  });

  it("deep-links only to routes and filters that exist", () => {
    const linked = FEATURES.flatMap((f) => (f.href ? [f.href] : []));
    expect(linked.length).toBeGreaterThanOrEqual(12);
    for (const href of linked) {
      const url = new URL(href, "https://eclipse.test");
      expect(["/wardrobe", "/world", "/inspector"], href).toContain(url.pathname);
      const category = url.searchParams.get("category");
      if (category) expect(CATEGORIES as readonly string[], href).toContain(category);
    }
  });

  it("leaves World presets to its own route, since those are ECW1 codes", () => {
    expect(CATEGORIES as readonly string[]).not.toContain(WORLD_PRESETS_CATEGORY);
    expect(FEATURES.find((f) => f.title === "World")?.href).toBe("/world");
  });
});
