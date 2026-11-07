import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OutfitPost } from "@/lib/data/types";

vi.mock("server-only", () => ({}));

let look: OutfitPost | null = null;
vi.mock("@/lib/data", () => ({ repository: { getOutfit: async () => look } }));

const { alertModerators } = await import("./moderation-alert");
const { siteUrl } = await import("@/lib/site");

const HOOK = "https://discord.test/api/webhooks/2/mods";
const post: OutfitPost = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "@everyone *free gold*",
  author: "Kira",
  authorId: "33333333-3333-4333-8333-333333333333",
  authorVerified: false,
  code: "ECA1:c2xvdCAwIDEK",
  className: null,
  armor: null,
  race: null,
  category: "Armor",
  tags: [],
  upvotes: 2,
  createdAt: "2026-11-01T00:00:00.000Z",
  gallery: ["https://stub.supabase.co/storage/v1/object/public/showcase/a/b.avif"],
};

const sent: { url: string; body: Record<string, unknown> }[] = [];

beforeEach(() => {
  look = post;
  sent.length = 0;
  vi.stubEnv("DISCORD_MOD_WEBHOOK_URL", HOOK);
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    sent.push({ url, body: JSON.parse(String(init.body)) });
    return new Response(null, { status: 204 });
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("the moderators' Discord alert", () => {
  it("names the look, the reason and where to review it, and pings nobody", async () => {
    await alertModerators(post.id, "spam");
    expect(sent).toHaveLength(1);
    expect(sent[0].url).toBe(HOOK);
    expect(sent[0].body.allowed_mentions).toEqual({ parse: [] });
    const [embed] = sent[0].body.embeds as Record<string, unknown>[];
    expect(embed.title).toBe("Reported: @everyone *free gold*");
    expect(embed.url).toBe(`${siteUrl}/wardrobe/${post.id}`);
    expect(embed.description).toContain("Spam or advertising");
    expect(embed.description).toContain(`${siteUrl}/moderation`);
    expect(embed.description).toContain("Kira");
    expect(embed.thumbnail).toEqual({ url: `${siteUrl}/wardrobe/${post.id}/cover` });
  });

  it("never says who sent the report", async () => {
    await alertModerators(post.id, "other");
    expect(JSON.stringify(sent[0].body)).not.toMatch(/reporter|reported by/i);
  });

  it("sends nothing when no channel is set up", async () => {
    vi.stubEnv("DISCORD_MOD_WEBHOOK_URL", "");
    await alertModerators(post.id, "spam");
    expect(sent).toEqual([]);
  });

  it("sends nothing for a look that is already gone", async () => {
    look = null;
    await alertModerators(post.id, "spam");
    expect(sent).toEqual([]);
  });

  it("leaves the picture out when the look has no screenshot", async () => {
    look = { ...post, gallery: [] };
    await alertModerators(post.id, "spam");
    const [embed] = sent[0].body.embeds as Record<string, unknown>[];
    expect(embed.thumbnail).toBeUndefined();
  });
});
