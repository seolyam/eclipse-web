import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Account, GameLink, GameSet } from "@/lib/data/types";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
  usePathname: () => "/loadouts",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/app/actions", () => ({
  createGameLinkCode: vi.fn(),
  inspectCode: vi.fn(async () => ({ kind: "error", error: "" })),
  publishOutfit: vi.fn(),
  removeGameSet: vi.fn(),
  removeScreenshot: vi.fn(),
  removeSetPicture: vi.fn(),
  unlinkGame: vi.fn(),
  uploadScreenshot: vi.fn(),
}));

// The signed-in page cannot be reached with a test session while email login is off,
// so it is rendered here with the data layer stubbed and everything else real.
const data = vi.hoisted(() => ({
  account: null as Account | null,
  links: [] as GameLink[],
  sets: [] as GameSet[],
  set: null as GameSet | null,
  live: true,
  clear: vi.fn(async () => {}),
}));

vi.mock("@/lib/data", () => ({
  repository: {
    get live() {
      return data.live;
    },
    getAccount: async () => data.account,
    listGameLinks: async () => data.links,
    listGameSets: async () => data.sets,
    getGameSet: async () => data.set,
    clearOrphanPictures: data.clear,
  },
}));

// Clearing old pictures runs after the response, which only a real request has.
const later = vi.hoisted(() => vi.fn());
vi.mock("next/server", async (original) => ({ ...(await original<typeof import("next/server")>()), after: later }));

const { default: SetsPage } = await import("./page");
const { default: SetPage } = await import("../sets/[id]/page");

const ME: Account = { id: "me", name: "seolyam", avatar: null, provider: "discord", moderator: false };
const CODE = `ECA1:${Buffer.from("slot 0 259306\nslot 4 1001735\n").toString("base64")}`;
const SET: GameSet = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Raid night",
  code: CODE,
  updatedAt: new Date().toISOString(),
  gallery: [],
};
const PICTURE = "00000000-0000-0000-0000-000000000001/00000000-0000-0000-0000-0000000000aa.avif";

const html = async (page: Promise<ReactElement>) => renderToStaticMarkup(await page);

beforeEach(() => {
  Object.assign(data, { account: ME, links: [], sets: [], set: null, live: true });
  later.mockReset();
  data.clear.mockClear();
});

describe("Loadouts", () => {
  it("offers a visitor sign-in, and no sets", async () => {
    data.account = null;
    const page = await html(SetsPage({}));
    expect(page).toContain("Continue with Discord");
    expect(page).not.toContain("Link a game");
  });

  it("lets anyone import a code, signed in or not", async () => {
    data.account = null;
    expect(await html(SetsPage({}))).toContain('id="import-heading"');
    data.account = ME;
    expect(await html(SetsPage({}))).toContain('id="import-heading"');
  });

  it("puts Import first and the loadouts below it", async () => {
    data.sets = [SET];
    const page = await html(SetsPage({}));
    expect(page.indexOf("import-heading")).toBeGreaterThan(-1);
    expect(page.indexOf("import-heading")).toBeLessThan(page.indexOf("Raid night"));
  });

  it("switches between Loadouts and the Dressing room with pills", async () => {
    const page = await html(SetsPage({}));
    expect(page).toMatch(/<a [^>]*aria-current="page"[^>]*>Loadouts<\/a>/);
    expect(page).toContain('href="/dressing-room"');
  });

  it("opens Import on a linked code", async () => {
    const page = await html(SetsPage({ searchParams: Promise.resolve({ code: CODE }) }));
    expect(page).toContain(CODE);
  });

  it("says so when there is no database to sign in to", async () => {
    Object.assign(data, { account: null, live: false });
    const page = await html(SetsPage({}));
    expect(page).toContain("not connected");
    expect(page).not.toContain("Continue with Discord");
  });

  it("explains itself to an account with nothing linked", async () => {
    const page = await html(SetsPage({}));
    expect(page).toContain("Link a game");
    expect(page).toContain("Nothing here yet");
    expect(page).toContain("0 loadouts");
  });

  it("lists a set with its pieces, a way in and a way to remove it", async () => {
    data.sets = [SET];
    const page = await html(SetsPage({}));
    expect(page).toContain("Raid night");
    expect(page).toContain(`href="/sets/${SET.id}"`);
    expect(page).toContain("1 loadout");
    expect(page).toContain("Remove Raid night");
    expect(page).toContain("<img");
  });

  it("says how many pictures the game sent with a set", async () => {
    data.sets = [{ ...SET, gallery: [PICTURE, PICTURE.replace("aa.avif", "bb.avif")] }];
    expect(await html(SetsPage({}))).toContain("2 pictures from your game");
    data.sets = [SET];
    expect(await html(SetsPage({}))).not.toContain("from your game");
  });

  it("puts what the game sent up top, with the picture and a way to publish it", async () => {
    const SENT = { ...SET, id: "22222222-2222-4222-8222-222222222222", name: "Nightmare", gallery: [PICTURE] };
    data.sets = [SET, SENT];
    const page = await html(SetsPage({}));
    const ready = page.slice(page.indexOf("Ready to publish"), page.indexOf("Linked games"));
    expect(ready).toContain("Nightmare");
    expect(ready).not.toContain("Raid night");
    expect(ready).toContain(PICTURE.replace(".avif", "-thumb.avif"));
    expect(ready).toMatch(new RegExp(`href="/sets/${SENT.id}"[^>]*>Publish<`));
  });

  it("shows the game's picture on its set's card", async () => {
    data.sets = [{ ...SET, gallery: [PICTURE] }];
    const page = await html(SetsPage({}));
    const card = page.slice(page.indexOf("1 loadout<"));
    expect(card).toContain(PICTURE.replace(".avif", "-thumb.avif"));
  });

  it("has no call to publish when the game sent nothing", async () => {
    data.sets = [SET];
    expect(await html(SetsPage({}))).not.toContain("Ready to publish");
  });

  it("clears old set pictures after answering, and only for a signed-in owner", async () => {
    await html(SetsPage({}));
    expect(later).toHaveBeenCalledTimes(1);
    await later.mock.calls[0][0]();
    expect(data.clear).toHaveBeenCalledTimes(1);
    later.mockReset();
    data.account = null;
    await html(SetsPage({}));
    expect(later).not.toHaveBeenCalled();
  });

  it("does not fall over on a code this site cannot read", async () => {
    data.sets = [{ ...SET, code: "ECA1:!!!" }];
    expect(await html(SetsPage({}))).toContain("Raid night");
  });

  it("names a linked game by the character that last synced", async () => {
    data.links = [{ id: "l", label: "Lee - Icecrown", linkedAt: SET.updatedAt, lastSyncAt: SET.updatedAt }];
    const page = await html(SetsPage({}));
    expect(page).toContain("Lee - Icecrown");
    expect(page).toContain("Synced just now");
    expect(page).toContain("Unlink");
  });

  it("does not invent a name for a game that has never synced", async () => {
    data.links = [{ id: "l", label: "", linkedAt: SET.updatedAt, lastSyncAt: null }];
    expect(await html(SetsPage({}))).toContain("Waiting for its first sync");
  });
});

describe("one set", () => {
  const open = (id: string) => SetPage({ params: Promise.resolve({ id }) });

  it("opens in the inspector, with the way to publish it", async () => {
    data.set = SET;
    const page = await html(open(SET.id));
    expect(page).toContain("Raid night");
    expect(page).toContain("Only you can see this set");
    expect(page).toContain("Remove Raid night");
  });

  it("shows what the game sent first, and points to the form that publishes it", async () => {
    data.set = { ...SET, gallery: [PICTURE] };
    const page = await html(open(SET.id));
    expect(page).toContain("Your game sent 1 picture of this look");
    expect(page).toContain(PICTURE.replace(".avif", "-thumb.avif"));
    expect(page).toContain('href="#publish"');
    data.set = SET;
    expect(await html(open(SET.id))).not.toContain("Your game sent");
  });

  it("asks a signed-out visitor to sign in instead of reading the set", async () => {
    data.account = null;
    data.set = SET;
    const page = await html(open(SET.id));
    expect(page).toContain("Continue with Discord");
    expect(page).not.toContain("Raid night");
  });

  it("does not exist for anyone it does not belong to", async () => {
    await expect(html(open(SET.id))).rejects.toThrow("NOT_FOUND");
  });
});
