import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Account, GameSet, OutfitPost } from "@/lib/data/types";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/publish",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/app/actions", () => ({
  inspectCode: vi.fn(async () => ({ kind: "error", error: "" })),
  publishOutfit: vi.fn(),
  removeScreenshot: vi.fn(),
  removeSetPicture: vi.fn(),
  uploadScreenshot: vi.fn(),
}));

// The signed-in page cannot be reached with a test session while email login is off,
// so it is rendered here with the data layer stubbed and everything else real.
const data = vi.hoisted(() => ({
  account: null as Account | null,
  sets: [] as GameSet[],
  outfit: null as OutfitPost | null,
  live: true,
}));

vi.mock("@/lib/data", () => ({
  repository: {
    get live() {
      return data.live;
    },
    getAccount: async () => data.account,
    listGameSets: async () => data.sets,
  },
  getOutfit: async () => data.outfit,
}));

const { default: PublishPage } = await import("./page");

const ME: Account = { id: "me", name: "seolyam", avatar: null, provider: "discord", moderator: false };
const CODE = `ECA1:${Buffer.from("slot 0 259306\nslot 4 1001735\n").toString("base64")}`;
const PICTURE = "00000000-0000-0000-0000-000000000001/00000000-0000-0000-0000-0000000000aa.avif";
const SET: GameSet = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Raid night",
  code: CODE,
  updatedAt: new Date().toISOString(),
  gallery: [],
};
const SENT: GameSet = { ...SET, id: "22222222-2222-4222-8222-222222222222", name: "Nightmare", gallery: [PICTURE] };

const html = async (page: Promise<ReactElement>) => renderToStaticMarkup(await page);
const open = (params: Record<string, string> = {}) => html(PublishPage({ searchParams: Promise.resolve(params) }));

beforeEach(() => {
  Object.assign(data, { account: ME, sets: [], outfit: null, live: true });
});

describe("Publish a look", () => {
  it("is its own page, with a box to paste a code into", async () => {
    const page = await open();
    expect(page).toContain("Publish a look");
    expect(page).toContain('id="code-heading"');
  });

  it("lists what the game sent, each with a way to publish it", async () => {
    data.sets = [SET, SENT];
    const page = await open();
    const ready = page.slice(page.indexOf("Ready to publish"), page.indexOf('id="code-heading"'));
    expect(ready).toContain("Nightmare");
    expect(ready).not.toContain("Raid night");
    expect(ready).toContain(PICTURE.replace(".avif", "-thumb.avif"));
    expect(ready).toMatch(new RegExp(`href="/sets/${SENT.id}"[^>]*>Publish<`));
  });

  it("leaves out Ready to publish when the game sent nothing", async () => {
    data.sets = [SET];
    expect(await open()).not.toContain("Ready to publish");
  });

  it("opens on a linked code", async () => {
    expect(await open({ code: CODE })).toContain(CODE);
  });

  it("asks a signed-out visitor to sign in first", async () => {
    data.account = null;
    const page = await open({ code: CODE });
    expect(page).toContain("Continue with Discord");
    expect(page).not.toContain('id="code-heading"');
  });

  it("says publishing is not open when there is no database", async () => {
    Object.assign(data, { account: null, live: false });
    const page = await open();
    expect(page).toContain("not open yet");
    expect(page).not.toContain("Continue with Discord");
  });
});
