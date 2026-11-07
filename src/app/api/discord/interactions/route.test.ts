import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { OutfitPost, SearchEntry } from "@/lib/data/types";

vi.mock("server-only", () => ({}));

// after() needs a live request; here it runs the work and lets the test await it.
const pending: Promise<unknown>[] = [];
vi.mock("next/server", () => ({ after: (work: () => Promise<unknown>) => pending.push(work()) }));

let looks: OutfitPost[] = [];
let index: SearchEntry[] = [];
vi.mock("@/lib/data", () => ({
  repository: {
    getOutfit: async (id: string) => looks.find((l) => l.id === id) ?? null,
    searchIndex: async () => index,
  },
}));

const { POST } = await import("./route");
const { lookId } = await import("./commands");
const { siteUrl } = await import("@/lib/site");

const post: OutfitPost = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "Frost in the Fens",
  author: "Kira_*the*_Bold",
  authorId: "33333333-3333-4333-8333-333333333333",
  authorVerified: false,
  code: "ECA1:c2xvdCAwIDEK",
  className: null,
  armor: null,
  race: null,
  category: "Armor",
  tags: [],
  upvotes: 9,
  createdAt: "2026-11-01T00:00:00.000Z",
  gallery: ["https://stub.supabase.co/storage/v1/object/public/showcase/a/b.avif"],
};

let keys: CryptoKeyPair;
let publicHex = "";
const toHex = (bytes: ArrayBuffer) => Buffer.from(bytes).toString("hex");

beforeAll(async () => {
  keys = (await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"])) as CryptoKeyPair;
  publicHex = toHex(await crypto.subtle.exportKey("raw", keys.publicKey));
});

async function send(payload: unknown, sign: "good" | "bad" | "none" = "good") {
  const body = JSON.stringify(payload);
  const timestamp = "1762500000";
  const headers: Record<string, string> = { "x-signature-timestamp": timestamp };
  if (sign !== "none") {
    const sig = await crypto.subtle.sign("Ed25519", keys.privateKey, new TextEncoder().encode(timestamp + body));
    headers["x-signature-ed25519"] = sign === "good" ? toHex(sig) : toHex(sig).replace(/^./, (c) => (c === "0" ? "1" : "0"));
  }
  return POST(new Request(`${siteUrl}/api/discord/interactions`, { method: "POST", headers, body }));
}

const command = (name: string, options: Record<string, string>) => ({
  type: 2,
  application_id: "app-1",
  token: "tok-1",
  data: { name, options: Object.entries(options).map(([n, value]) => ({ name: n, type: 3, value })) },
});

const edits: { url: string; method?: string; body: Record<string, unknown> }[] = [];

beforeEach(() => {
  looks = [post];
  index = [];
  edits.length = 0;
  pending.length = 0;
  vi.stubEnv("DISCORD_PUBLIC_KEY", publicHex);
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    edits.push({ url, method: init.method, body: JSON.parse(String(init.body)) });
    return new Response(null, { status: 200 });
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

/** Runs a command that defers, and returns the message it edits in. */
async function deferred(payload: unknown) {
  const res = await send(payload);
  expect(await res.json()).toEqual({ type: 5 });
  await Promise.all(pending);
  expect(edits).toHaveLength(1);
  expect(edits[0].method).toBe("PATCH");
  expect(edits[0].url).toBe("https://discord.com/api/v10/webhooks/app-1/tok-1/messages/@original");
  return edits[0].body;
}

describe("Discord's signature", () => {
  it("answers Discord's PING when the signature is good", async () => {
    const res = await send({ type: 1 });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ type: 1 });
  });

  it("refuses a forged or missing signature before reading anything", async () => {
    expect((await send({ type: 1 }, "bad")).status).toBe(401);
    expect((await send({ type: 1 }, "none")).status).toBe(401);
  });

  it("refuses everything when no public key is set", async () => {
    vi.stubEnv("DISCORD_PUBLIC_KEY", "");
    expect((await send({ type: 1 })).status).toBe(401);
  });
});

describe("/look", () => {
  it("reads a look's id from its link or takes the id itself", () => {
    expect(lookId(`${siteUrl}/wardrobe/${post.id}`)).toBe(post.id);
    expect(lookId(`https://eclipsewow.vercel.app/wardrobe/${post.id}?from=discord`)).toBe(post.id);
    expect(lookId(` ${post.id} `)).toBe(post.id);
    expect(lookId("https://example.com/not a look")).toBeNull();
  });

  it("shows the look with its picture, code and a link, and pings nobody", async () => {
    const reply = await deferred(command("look", { look: `${siteUrl}/wardrobe/${post.id}` }));
    expect(reply.allowed_mentions).toEqual({ parse: [] });
    expect(reply.flags).toBeUndefined();
    const [embed] = reply.embeds as Record<string, unknown>[];
    expect(embed.title).toBe(post.title);
    expect(embed.url).toBe(`${siteUrl}/wardrobe/${post.id}`);
    expect(embed.description).toContain("by Kira\\_\\*the\\*\\_Bold");
    expect(embed.description).toContain("9 upvotes");
    expect(embed.description).toContain(post.code);
    expect(embed.image).toEqual({ url: `${siteUrl}/wardrobe/${post.id}/cover` });
    expect(JSON.stringify(reply.components)).toContain(`${siteUrl}/wardrobe/${post.id}`);
  });

  it("says so, without the database, when the text is not a look's link", async () => {
    const res = await send(command("look", { look: "hello there" }));
    const body = await res.json();
    expect(body.type).toBe(4);
    expect(body.data.flags).toBe(64);
    expect(pending).toEqual([]);
  });

  it("says so when no look has that id", async () => {
    looks = [];
    const reply = await deferred(command("look", { look: post.id }));
    expect(reply.content).toMatch(/no look/i);
    expect(reply.embeds).toBeUndefined();
  });
});

describe("/wardrobe", () => {
  const entry = (n: number, title: string, author: string | null = "Kira"): SearchEntry => ({
    id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`, title, author,
  });

  it("lists matching looks by title or creator, every word counting", async () => {
    index = [entry(1, "Frost in the Fens"), entry(2, "Ember Knight", "Frostbite"), entry(3, "Sunlit Robes")];
    const reply = await deferred(command("wardrobe", { search: "frost" }));
    const [embed] = reply.embeds as Record<string, string>[];
    expect(embed.description).toContain("Frost in the Fens");
    expect(embed.description).toContain("Ember Knight");
    expect(embed.description).not.toContain("Sunlit");
  });

  it("shows five and links the rest to the Wardrobe's own search", async () => {
    index = Array.from({ length: 8 }, (_, i) => entry(i + 1, `Frost ${i + 1}`));
    const reply = await deferred(command("wardrobe", { search: "frost" }));
    const [embed] = reply.embeds as Record<string, string>[];
    expect(embed.description.match(/\/wardrobe\/0000/g)).toHaveLength(5);
    expect(embed.description).toContain(`${siteUrl}/wardrobe?q=frost`);
    expect(embed.description).toContain("See all 8");
  });

  it("says so when nothing matches", async () => {
    index = [entry(1, "Sunlit Robes")];
    const reply = await deferred(command("wardrobe", { search: "frost" }));
    expect(reply.content).toMatch(/no looks match/i);
  });
});
