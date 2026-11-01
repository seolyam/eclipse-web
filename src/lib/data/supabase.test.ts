import { createClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LOOKS_PER_PAGE } from "@/lib/domain";

vi.mock("server-only", () => ({}));

// The real client over a stubbed network, so these read what really goes to
// PostgREST, without needing a live project.
const requests: URL[] = [];
let reply: () => Response = () => Response.json([]);

const stubFetch: typeof fetch = async (input) => {
  requests.push(new URL(input instanceof Request ? input.url : String(input)));
  return reply();
};

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: async () => createClient("https://stub.supabase.co", "stub-key", { global: { fetch: stubFetch } }),
}));

const { supabaseRepository: repo } = await import("./supabase");
const { builtinRepository } = await import("./builtin");

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
  gallery: ["https://x.test/a.png"],
  profiles: { display_name: "Kira", verified: true },
};

beforeEach(() => {
  requests.length = 0;
  reply = () => Response.json([]);
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
    const r = await repo.listOutfits({ sort: "top", page: 2 });
    expect(r.total).toBe(25);
    expect(r.posts.map((p) => p.title)).toEqual(["A real post"]);
    expect(requests[0].searchParams.get("offset")).toBe(String(LOOKS_PER_PAGE));
    expect(requests[0].searchParams.get("limit")).toBe(String(LOOKS_PER_PAGE));
  });

  it("filters the Showcase to posts with a capture", async () => {
    await repo.listOutfits({ sort: "top", captured: true });
    expect(requests[0].searchParams.get("gallery")).toBe("neq.{}");
  });

  it("treats a page past the end as empty, not as a crash", async () => {
    reply = () => Response.json({ code: "PGRST103", message: "Requested range not satisfiable" }, { status: 416 });
    await expect(repo.listOutfits({ sort: "top", page: 99 })).resolves.toEqual({ posts: [], total: 0 });
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

  it("keeps the built-in world presets, since nothing here publishes one yet", async () => {
    const presets = await repo.listWorldPresets({});
    expect(presets.length).toBeGreaterThan(0);
    expect(presets.every((p) => p.author === null)).toBe(true);
  });
});
