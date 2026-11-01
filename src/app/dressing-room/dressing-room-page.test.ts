import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { SLOT_NAMES, VISIBLE_SLOTS } from "@/lib/domain";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/data", () => ({ repository: { live: true } }));

import { GET } from "../api/items/route";
import DressingRoomPage from "./page";

const ask = async (query: string) => {
  const res = GET(new NextRequest(`https://site.test/api/items${query}`));
  return (await res.json()) as { id: number; name: string }[];
};

describe("the dressing room page", () => {
  const html = renderToStaticMarkup(DressingRoomPage());

  it("offers every slot that shows on a character, and only those", () => {
    for (const slot of VISIBLE_SLOTS) expect(html).toContain(`aria-label="Choose ${SLOT_NAMES[slot]}"`);
    expect(html).not.toContain('aria-label="Choose Neck"');
  });

  it("has no code to copy before anything is chosen", () => {
    expect(html).not.toContain('aria-label="Copy code"');
  });

  it("says what the preview leaves out, so nobody mistakes it for the game", () => {
    expect(html).toMatch(/still figure/i);
    expect(html).toMatch(/default face and hair/i);
  });

  it("does not make the page wait for the character", () => {
    expect(html).toContain("Dressing the character");
  });

  // Rings and scenes are CC BY-NC-SA: the credit goes wherever they appear.
  it("credits the Narcissus art it shows", () => {
    expect(html).toContain("Peterodox");
  });
});

describe("the items route", () => {
  it("answers one slot's items", async () => {
    const hits = await ask("?slot=0");
    expect(hits.length).toBeGreaterThan(0);
  });

  it("answers nothing for a slot it cannot read", async () => {
    expect(await ask("?slot=abc")).toEqual([]);
    expect(await ask("")).toEqual([]);
  });
});
