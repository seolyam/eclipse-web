import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LOOKS_PER_PAGE } from "@/lib/domain";

vi.mock("server-only", () => ({}));
vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://stub.supabase.co");

// The real client over a stubbed network, so these read what really goes to
// PostgREST, without needing a live project.
const requests: URL[] = [];
const removed: string[] = [];
let reply: (url: URL, init?: RequestInit) => Response = () => Response.json([]);

const stubFetch: typeof fetch = async (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  requests.push(url);
  if (init?.method === "DELETE" && url.pathname.startsWith("/storage/")) {
    removed.push(...(JSON.parse(String(init.body)) as { prefixes: string[] }).prefixes);
  }
  return reply(url, init);
};

let user: {
  id: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
} | null = null;

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: async () => {
    const client = createClient("https://stub.supabase.co", "stub-key", { global: { fetch: stubFetch } });
    client.auth.getUser = (async () => ({ data: { user }, error: null })) as never;
    return client;
  },
}));

const { supabaseRepository: repo } = await import("./supabase");
const { builtinRepository } = await import("./builtin");

const SHOT = "33333333-3333-4333-8333-333333333333/44444444-4444-4444-8444-444444444444.avif";
const THUMB = SHOT.replace(".avif", "-thumb.avif");

const row = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "A real post",
  code: "ECA1:c2xvdCAwIDEK",
  class_name: "Mage",
  armor: "cloth",
  race: null,
  category: "Armor",
  tags: [],
  upvotes: 3,
  created_at: "2026-11-01T00:00:00.000Z",
  author_id: "33333333-3333-4333-8333-333333333333",
  gallery: [SHOT],
  profiles: { display_name: "Kira", verified: true },
};

beforeEach(() => {
  requests.length = 0;
  removed.length = 0;
  reply = () => Response.json([]);
  user = null;
});

const failWith = (code: string, status: number) => () => Response.json({ code, message: "refused" }, { status });
const input = { title: "A look", code: "ECA1:c2xvdCAwIDEK", category: "Armor" as const, tags: [], gallery: [] };

describe("the signed-in account", () => {
  it("is nobody without a session, and asks the database nothing", async () => {
    expect(await repo.getAccount()).toBeNull();
    expect(requests).toHaveLength(0);
  });

  it("reads the public name", async () => {
    user = { id: row.id };
    reply = () => Response.json([{ display_name: "Kira", moderators: null }]);
    expect(await repo.getAccount()).toEqual({ id: row.id, name: "Kira", avatar: null, provider: null, moderator: false });
    expect(requests[0].searchParams.get("id")).toBe(`eq.${row.id}`);
  });

  it("has no name until one is chosen", async () => {
    user = { id: row.id };
    reply = () => Response.json([{ display_name: null, moderators: null }]);
    expect(await repo.getAccount()).toEqual({ id: row.id, name: null, avatar: null, provider: null, moderator: false });
  });

  it("carries the picture and provider from the sign-in", async () => {
    user = {
      id: row.id,
      user_metadata: { avatar_url: "https://cdn.discordapp.com/avatars/1/a.png" },
      app_metadata: { provider: "discord" },
    };
    reply = () => Response.json([{ display_name: "Kira", moderators: null }]);
    expect(await repo.getAccount()).toMatchObject({
      avatar: "https://cdn.discordapp.com/avatars/1/a.png",
      provider: "discord",
    });
  });

  it("ignores a picture that is not an https address", async () => {
    // Anyone can write their own user metadata, so this value is not the provider's word.
    user = { id: row.id, user_metadata: { avatar_url: "http://example.test/a.png" } };
    reply = () => Response.json([{ display_name: "Kira", moderators: null }]);
    expect(await repo.getAccount()).toMatchObject({ avatar: null });
  });

  it("knows a moderator", async () => {
    user = { id: row.id };
    reply = () => Response.json([{ display_name: "Kira", moderators: { user_id: row.id } }]);
    expect(await repo.getAccount()).toMatchObject({ id: row.id, name: "Kira", moderator: true });
  });

  it("saves a name to the signed-in profile only", async () => {
    user = { id: row.id };
    reply = () => Response.json({ display_name: "Kira" });
    expect(await repo.setDisplayName("Kira")).toEqual({ ok: true, value: "Kira" });
    expect(requests[0].searchParams.get("id")).toBe(`eq.${row.id}`);
  });

  it("needs a session to save a name", async () => {
    expect((await repo.setDisplayName("Kira")).ok).toBe(false);
    expect(requests).toHaveLength(0);
  });

  it("says when a name is taken", async () => {
    user = { id: row.id };
    reply = failWith("23505", 409);
    expect(await repo.setDisplayName("Kira")).toEqual({ ok: false, error: "That name is taken. Try another." });
  });
});

describe("a post from the database", () => {
  it("links its screenshots and names its author", async () => {
    reply = () => Response.json(row);
    const post = await repo.getOutfit(row.id);
    expect(post?.gallery).toEqual([`https://stub.supabase.co/storage/v1/object/public/showcase/${SHOT}`]);
    expect(post?.authorId).toBe(row.author_id);
  });
});

describe("screenshots", () => {
  const stored = () => Response.json({ Key: "showcase/x", Id: "x" });
  const refused = (message: string) => Response.json({ statusCode: "403", error: "Unauthorized", message }, { status: 400 });
  const screenshot = async () => {
    const png = await sharp({ create: { width: 64, height: 36, channels: 3, background: "#403020" } }).png().toBuffer();
    return new File([new Uint8Array(png)], "capture.png", { type: "image/png" });
  };

  it("stores a full file and its thumbnail in the person's folder", async () => {
    user = { id: row.author_id };
    reply = stored;
    const result = await repo.uploadScreenshot(await screenshot());
    if (!result.ok) throw new Error(result.error);
    expect(result.value).toMatch(new RegExp(`^${row.author_id}/[0-9a-f-]{36}\\.avif$`));
    expect(requests.map((r) => r.pathname)).toEqual([
      `/storage/v1/object/showcase/${result.value.replace(".avif", "-thumb.avif")}`,
      `/storage/v1/object/showcase/${result.value}`,
    ]);
  });

  it("needs a session, and does no work without one", async () => {
    expect(await repo.uploadScreenshot(await screenshot())).toEqual({ ok: false, error: "Sign in to upload." });
    expect(requests).toHaveLength(0);
  });

  it("says so when the file is not an image", async () => {
    user = { id: row.author_id };
    const result = await repo.uploadScreenshot(new File(["not an image"], "a.png", { type: "image/png" }));
    expect(result).toEqual({ ok: false, error: "That file could not be read as an image." });
    expect(requests).toHaveLength(0);
  });

  it("explains the limit when the database refuses another", async () => {
    user = { id: row.author_id };
    reply = () => refused("new row violates row-level security policy");
    expect(await repo.uploadScreenshot(await screenshot())).toEqual({
      ok: false,
      error: "You have 60 screenshots stored. Delete a look to free some up.",
    });
  });

  it("leaves no thumbnail behind when the full file is refused", async () => {
    user = { id: row.author_id };
    let uploads = 0;
    reply = (url) => {
      if (!url.pathname.includes(row.author_id)) return Response.json([]);
      return ++uploads === 1 ? stored() : refused("new row violates row-level security policy");
    };
    const result = await repo.uploadScreenshot(await screenshot());
    expect(result.ok).toBe(false);
    expect(removed).toHaveLength(1);
    expect(removed[0]).toMatch(/-thumb\.avif$/);
  });

  it("removes a file and its thumbnail together", async () => {
    user = { id: row.author_id };
    expect(await repo.removeScreenshot(SHOT)).toEqual({ ok: true, value: SHOT });
    expect(removed).toEqual([SHOT, THUMB]);
  });
});

describe("deleting a look", () => {
  it("removes the look and every file it held", async () => {
    user = { id: row.author_id };
    reply = (url) => Response.json(url.pathname.startsWith("/rest/") ? [{ gallery: [SHOT] }] : []);
    expect(await repo.deleteOutfit(row.id)).toEqual({ ok: true, value: row.id });
    expect(requests[0].searchParams.get("id")).toBe(`eq.${row.id}`);
    expect(removed).toEqual([SHOT, THUMB]);
  });

  // RLS answers a refused delete with no rows, not an error.
  it("says so when the database deleted nothing, and keeps the files", async () => {
    user = { id: "55555555-5555-4555-8555-555555555555" };
    expect(await repo.deleteOutfit(row.id)).toEqual({ ok: false, error: "You can only delete your own looks." });
    expect(removed).toEqual([]);
  });

  it("needs a session", async () => {
    expect((await repo.deleteOutfit(row.id)).ok).toBe(false);
    expect(requests).toHaveLength(0);
  });

  it("cannot delete a built-in set", async () => {
    user = { id: row.author_id };
    expect((await repo.deleteOutfit("set-1074")).ok).toBe(false);
    expect(requests).toHaveLength(0);
  });
});

describe("publishing", () => {
  it("asks for a name when the database refuses a nameless author", async () => {
    user = { id: row.id };
    reply = failWith("42501", 403);
    expect(await repo.createOutfit(input)).toEqual({ ok: false, error: "Choose a public name first, from the account button." });
  });

  it("explains the hourly limit", async () => {
    user = { id: row.id };
    reply = failWith("EC001", 400);
    expect(await repo.createOutfit(input)).toEqual({ ok: false, error: "That is 20 looks this hour. Try again later." });
  });
});

describe("remix credit", () => {
  const original = "22222222-2222-4222-8222-222222222222";

  it("names the original when publishing a remix", async () => {
    user = { id: row.author_id };
    let sent: Record<string, unknown> = {};
    reply = (_, init) => {
      sent = JSON.parse(String(init?.body));
      return Response.json(row);
    };
    await repo.createOutfit({ ...input, remixedFrom: original });
    expect(sent.remixed_from).toBe(original);
  });

  it("credits nothing on an ordinary look", async () => {
    user = { id: row.author_id };
    let sent: Record<string, unknown> = {};
    reply = (_, init) => {
      sent = JSON.parse(String(init?.body));
      return Response.json(row);
    };
    await repo.createOutfit(input);
    expect(sent.remixed_from).toBeNull();
  });

  it("shows the original and its author", async () => {
    reply = () => Response.json({ ...row, remix: { id: original, title: "The original", profiles: { display_name: "Ana" } } });
    expect((await repo.getOutfit(row.id))?.remixedFrom).toEqual({ id: original, title: "The original", author: "Ana" });
    expect(requests[0].searchParams.get("select")).toContain("remix:outfits!remixed_from(");
  });

  it("shows nothing once the original is gone or hidden", async () => {
    reply = () => Response.json({ ...row, remix: null });
    expect((await repo.getOutfit(row.id))?.remixedFrom).toBeNull();
  });
});

describe("a creator's page", () => {
  it("counts the looks and upvotes visitors can see", async () => {
    reply = (url) => url.pathname.endsWith("/profiles")
      ? Response.json({ display_name: "Kira", verified: true, created_at: row.created_at })
      : Response.json([{ upvotes: 3 }, { upvotes: 4 }]);
    expect(await repo.getCreator(row.author_id)).toEqual({
      id: row.author_id, name: "Kira", verified: true, joinedAt: row.created_at, looks: 2, upvotes: 7,
    });
  });

  it("has no page for someone with no public name", async () => {
    reply = (url) => url.pathname.endsWith("/profiles")
      ? Response.json({ display_name: null, verified: false, created_at: row.created_at })
      : Response.json([]);
    expect(await repo.getCreator(row.author_id)).toBeNull();
  });

  it("is a 404, not a crash, for a malformed id", async () => {
    expect(await repo.getCreator("not-a-uuid")).toBeNull();
    expect(requests).toEqual([]);
  });
});

describe("reports", () => {
  it("files the reason through report_outfit", async () => {
    user = { id: row.author_id };
    reply = () => new Response(null, { status: 204 });
    expect(await repo.report(row.id, "spam")).toEqual({ ok: true, value: row.id });
    expect(requests[0].pathname).toBe("/rest/v1/rpc/report_outfit");
  });

  it("asks a visitor to sign in", async () => {
    reply = failWith("28000", 401);
    expect(await repo.report(row.id, "spam")).toEqual({ ok: false, error: "Sign in to report a look." });
  });

  it("cannot report a game set, which has no author to answer for it", async () => {
    expect((await repo.report("set-1", "spam")).ok).toBe(false);
    expect(requests).toEqual([]);
  });

  it("lists the moderation queue for a moderator", async () => {
    reply = () => Response.json([
      { outfit_id: row.id, title: "A real post", hidden: true, reports: 3, reasons: ["spam"], last_report: row.created_at },
    ]);
    expect(await repo.listReports()).toEqual([
      { id: row.id, title: "A real post", hidden: true, reports: 3, reasons: ["spam"], lastReport: row.created_at },
    ]);
  });

  it("gives anyone else an empty queue instead of an error page", async () => {
    reply = failWith("42501", 403);
    expect(await repo.listReports()).toEqual([]);
  });

  it("refuses a restore from someone who is not a moderator", async () => {
    reply = failWith("42501", 403);
    expect(await repo.restoreOutfit(row.id)).toEqual({ ok: false, error: "Only moderators can restore a look." });
  });

  it("carries the hidden flag so an author knows why their look is gone", async () => {
    reply = () => Response.json({ ...row, hidden: true });
    expect((await repo.getOutfit(row.id))?.hidden).toBe(true);
  });
});

describe("bookmarks", () => {
  it("is never bookmarked for a visitor, and asks the database nothing", async () => {
    expect(await repo.isBookmarked(row.id)).toBe(false);
    expect(requests).toEqual([]);
  });

  it("reads the signed-in account's own bookmark", async () => {
    user = { id: row.author_id };
    reply = () => Response.json([{ outfit_id: row.id }]);
    expect(await repo.isBookmarked(row.id)).toBe(true);
    expect(requests[0].searchParams.get("user_id")).toBe(`eq.${row.author_id}`);
  });

  it("adds a bookmark as the signed-in account", async () => {
    user = { id: row.author_id };
    reply = () => new Response(null, { status: 201 });
    expect(await repo.setBookmark(row.id, true)).toEqual({ ok: true, value: true });
    expect(requests[0].pathname).toBe("/rest/v1/outfit_bookmarks");
  });

  it("treats a second add as already saved", async () => {
    user = { id: row.author_id };
    reply = failWith("23505", 409);
    expect(await repo.setBookmark(row.id, true)).toEqual({ ok: true, value: true });
  });

  it("removes only the account's own bookmark", async () => {
    user = { id: row.author_id };
    reply = () => new Response(null, { status: 204 });
    expect(await repo.setBookmark(row.id, false)).toEqual({ ok: true, value: false });
    expect(requests[0].searchParams.get("user_id")).toBe(`eq.${row.author_id}`);
    expect(requests[0].searchParams.get("outfit_id")).toBe(`eq.${row.id}`);
  });

  it("asks a visitor to sign in", async () => {
    expect(await repo.setBookmark(row.id, true)).toEqual({ ok: false, error: "Sign in to bookmark a look." });
  });

  it("lists only bookmarked looks, without the game's sets", async () => {
    user = { id: row.author_id };
    reply = () => Response.json([row], { headers: { "Content-Range": `0-0/1` } });
    const r = await repo.listOutfits({ sort: "newest", saved: true });
    expect(r).toMatchObject({ total: 1, posts: [{ id: row.id }] });
    expect(requests[0].searchParams.get("select")).toContain("outfit_bookmarks!inner(");
    expect(requests[0].searchParams.get("outfit_bookmarks.user_id")).toBe(`eq.${row.author_id}`);
  });

  it("has no bookmarks to list for a visitor", async () => {
    expect(await repo.listOutfits({ sort: "newest", saved: true })).toEqual({ posts: [], total: 0 });
    expect(requests).toEqual([]);
  });
});

describe("the Supabase adapter", () => {
  // outfit_votes is a second path from outfits to profiles, and a bare
  // profiles(...) embed makes PostgREST refuse the query as ambiguous.
  it("names the author relationship when it embeds a profile", async () => {
    await repo.listOutfits({ sort: "top" });
    await repo.getOutfit(row.id);
    for (const request of requests) {
      expect(request.searchParams.get("select")).toContain("profiles!outfits_author_id_fkey(");
    }
    expect(requests).toHaveLength(2);
  });

  it("asks for one page and reports the whole count", async () => {
    reply = () => Response.json([row], { headers: { "Content-Range": `24-24/25` } });
    // Captured, so the count is the database's alone: a game set has no capture.
    const r = await repo.listOutfits({ sort: "top", page: 2, captured: true });
    expect(r.total).toBe(25);
    expect(r.posts.map((p) => p.title)).toEqual(["A real post"]);
    expect(requests[0].searchParams.get("offset")).toBe(String(LOOKS_PER_PAGE));
    expect(requests[0].searchParams.get("limit")).toBe(String(LOOKS_PER_PAGE));
  });

  it("lists the game's sets after the published looks", async () => {
    const sets = await builtinRepository.listOutfits({ sort: "top" });
    reply = () => Response.json([row], { headers: { "Content-Range": `0-0/1` } });
    const r = await repo.listOutfits({ sort: "top" });
    expect(r.total).toBe(sets.total + 1);
    expect(r.posts).toHaveLength(LOOKS_PER_PAGE);
    expect(r.posts[0].title).toBe("A real post");
    expect(r.posts.slice(1).map((p) => p.id)).toEqual(sets.posts.slice(0, LOOKS_PER_PAGE - 1).map((p) => p.id));
  });

  it("shows the Wardrobe the game's sets when nobody has published yet", async () => {
    const sets = await builtinRepository.listOutfits({ sort: "top" });
    const r = await repo.listOutfits({ sort: "top" });
    expect(r.total).toBe(sets.total);
    expect(r.posts.map((p) => p.id)).toEqual(sets.posts.map((p) => p.id));
  });

  it("keeps paging through the sets where the published looks run out", async () => {
    const all = (await builtinRepository.listOutfits({ sort: "top", pageSize: 10_000 })).posts.map((p) => p.id);
    reply = () => Response.json([row], { headers: { "Content-Range": `24-24/25` } });
    const shared = await repo.listOutfits({ sort: "top", page: 2 });
    expect(shared.posts.slice(1).map((p) => p.id)).toEqual(all.slice(0, LOOKS_PER_PAGE - 1));

    // Past the last row PostgREST refuses the page, and the refusal holds no count.
    reply = (_, init) => init?.method === "HEAD"
      ? new Response(null, { headers: { "Content-Range": `*/25` } })
      : Response.json({ code: "PGRST103", message: "Requested range not satisfiable" }, { status: 416 });
    const after = await repo.listOutfits({ sort: "top", page: 3 });
    expect(after.total).toBe(all.length + 25);
    expect(after.posts.map((p) => p.id)).toEqual(all.slice(LOOKS_PER_PAGE - 1, LOOKS_PER_PAGE * 2 - 1));
  });

  it("holds the sets to the filters", async () => {
    const plate = await repo.listOutfits({ sort: "top", armor: "plate" });
    expect(plate.posts.length).toBeGreaterThan(0);
    expect(plate.posts.every((p) => p.armor === "plate")).toBe(true);
    expect((await repo.listOutfits({ sort: "top", race: "human" })).total).toBe(0);
  });

  it("keeps the sets out of the Showcase and out of one person's looks", async () => {
    expect(await repo.listOutfits({ sort: "top", captured: true })).toEqual({ posts: [], total: 0 });
    expect(await repo.listOutfits({ sort: "top", authorId: row.id })).toEqual({ posts: [], total: 0 });
  });

  it("indexes every set after the published looks, for search and the sitemap", async () => {
    reply = () => Response.json([row], { headers: { "Content-Range": `0-0/1` } });
    const index = await repo.searchIndex();
    expect(index[0].title).toBe("A real post");
    expect(index.slice(1)).toEqual(await builtinRepository.searchIndex());
  });

  it("filters the Showcase to posts with a capture", async () => {
    await repo.listOutfits({ sort: "top", captured: true });
    expect(requests[0].searchParams.get("gallery")).toBe("neq.{}");
  });

  it("filters to one author", async () => {
    await repo.listOutfits({ sort: "top", authorId: row.id });
    expect(requests[0].searchParams.get("author_id")).toBe(`eq.${row.id}`);
  });

  it("treats a page past the end as empty, not as a crash", async () => {
    const { total } = await builtinRepository.listOutfits({ sort: "top" });
    reply = (_, init) => init?.method === "HEAD"
      ? new Response(null, { headers: { "Content-Range": `*/0` } })
      : Response.json({ code: "PGRST103", message: "Requested range not satisfiable" }, { status: 416 });
    await expect(repo.listOutfits({ sort: "top", page: 99 })).resolves.toEqual({ posts: [], total });
  });

  it("does not swallow a failed count behind a refused page", async () => {
    reply = (_, init) => init?.method === "HEAD"
      ? new Response(null, { status: 500 })
      : Response.json({ code: "PGRST103", message: "Requested range not satisfiable" }, { status: 416 });
    await expect(repo.listOutfits({ sort: "top", page: 99 })).rejects.toThrow();
  });

  it("never sends a non-uuid id to Postgres", async () => {
    await expect(repo.getOutfit("not-a-uuid")).resolves.toBeNull();
    const vote = await repo.upvote("not-a-uuid");
    expect(vote.ok).toBe(false);
    expect(requests).toEqual([]);
  });

  it("still opens a real set by its link once the database is on", async () => {
    const { posts } = await builtinRepository.listOutfits({ sort: "top", armor: "plate", pageSize: 1 });
    const set = await repo.getOutfit(posts[0].id);
    expect(posts[0].id).toMatch(/^set-/);
    expect(set?.title).toBe(posts[0].title);
    expect(requests).toEqual([]);
  });
});
