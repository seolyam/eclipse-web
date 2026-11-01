import "server-only";
import { LOOKS_PER_PAGE, type ArmorType, type Category, type ClassName, type WorldGroup, type WorldLookName } from "@/lib/domain";
import { SCREENSHOT_BUCKET, screenshotUrl, thumbOf } from "@/lib/screenshots";
import { createServerSupabase } from "@/lib/supabase/server";
import { builtinRepository } from "./builtin";
import { compressScreenshot, SCREENSHOT_EXTENSION, SCREENSHOT_TYPE } from "./compress";
import type { OutfitFilters, OutfitList, OutfitPost, Repository, WorldFilters, WorldPreset, WriteResult } from "./types";

// The same seam as builtin.ts, over supabase/migrations. RLS is what protects the
// rows: this file holds no rule the database does not enforce.

interface OutfitRow {
  id: string;
  title: string;
  code: string;
  class_name: ClassName | null;
  armor: ArmorType | null;
  race: string | null;
  category: Category;
  tags: string[];
  upvotes: number;
  created_at: string;
  author_id: string;
  gallery: string[];
  profiles: { display_name: string | null; verified: boolean } | null;
}

interface PresetRow {
  id: string;
  title: string;
  look: WorldLookName;
  blurb: string;
  code: string;
  places: string[];
  place_group: WorldGroup;
  profiles: { display_name: string | null } | null;
}

// The hint is required: outfit_votes also joins outfits to profiles, and PostgREST
// refuses a bare profiles(...) embed as ambiguous.
const OUTFIT_COLUMNS =
  "id,title,code,class_name,armor,race,category,tags,upvotes,created_at,author_id,gallery,profiles!outfits_author_id_fkey(display_name,verified)";

const toPost = (r: OutfitRow): OutfitPost => ({
  id: r.id,
  title: r.title,
  author: r.profiles?.display_name ?? null,
  authorId: r.author_id,
  authorVerified: r.profiles?.verified ?? false,
  code: r.code,
  className: r.class_name,
  armor: r.armor,
  race: r.race,
  category: r.category,
  tags: r.tags,
  upvotes: r.upvotes,
  createdAt: r.created_at,
  gallery: r.gallery.map(screenshotUrl),
});

// A search term goes into PostgREST's filter text, where , ( ) are syntax.
const safeTerm = (q: string) => q.replace(/[^\p{L}\p{N} '-]/gu, " ").trim();

// Postgres answers a malformed uuid with an error, so an id from a URL is checked
// first. A bad link should be a 404, not a 500.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// What PostgREST answers when the requested page starts past the last row.
const RANGE_NOT_SATISFIABLE = "PGRST103";
// The errcode upvote_outfit raises for a signed-out caller.
const SIGNED_OUT = "28000";
// What Postgres answers when RLS refuses a row: here, an author with no name yet.
const REFUSED_BY_POLICY = "42501";
// The errcode limit_publishing raises (the names_and_limits migration).
const PUBLISHING_LIMIT = "EC001";
const UNIQUE_VIOLATION = "23505";

// Storage reports a refused upload by message. Past the folder check, which the
// site's own path always passes, the policy's only reason to refuse is the limit.
const uploadError = (message: string): WriteResult<string> => ({
  ok: false,
  error: message.includes("row-level security")
    ? "You have 60 screenshots stored. Delete a look to free some up."
    : "That screenshot could not be stored. Try again.",
});
const SEARCH_INDEX_SIZE = 200;

async function listOutfits(f: OutfitFilters): Promise<OutfitList> {
  const db = await createServerSupabase();
  const size = f.pageSize ?? LOOKS_PER_PAGE;
  const from = (Math.max(1, f.page ?? 1) - 1) * size;
  let query = db.from("outfits").select(OUTFIT_COLUMNS, { count: "exact" }).range(from, from + size - 1);
  if (f.captured) query = query.neq("gallery", "{}");
  if (f.authorId) query = query.eq("author_id", f.authorId);
  if (f.className) query = query.eq("class_name", f.className);
  if (f.race) query = query.eq("race", f.race);
  if (f.armor) query = query.eq("armor", f.armor);
  if (f.category) query = query.eq("category", f.category);
  if (f.tag) query = query.contains("tags", [f.tag]);
  const term = f.q ? safeTerm(f.q) : "";
  if (term) query = query.ilike("title", `%${term}%`);
  query =
    f.sort === "newest"
      ? query.order("created_at", { ascending: false })
      : f.sort === "top"
        ? query.order("upvotes", { ascending: false })
        : query.order("trending_score", { ascending: false });
  const { data, error, count } = await query;
  if (error?.code === RANGE_NOT_SATISFIABLE) return { posts: [], total: 0 };
  if (error) throw new Error(error.message);
  return { posts: (data as unknown as OutfitRow[]).map(toPost), total: count ?? 0 };
}

export const supabaseRepository: Repository = {
  live: true,
  listOutfits,
  async getOutfit(id) {
    // A set's link keeps working once the database is on: the set is still real.
    if (!UUID.test(id)) return builtinRepository.getOutfit(id);
    const db = await createServerSupabase();
    const { data, error } = await db.from("outfits").select(OUTFIT_COLUMNS).eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toPost(data as unknown as OutfitRow) : null;
  },
  async searchIndex() {
    const { posts } = await listOutfits({ sort: "top", pageSize: SEARCH_INDEX_SIZE });
    return posts.map(({ id, title, author }) => ({ id, title, author }));
  },
  async createOutfit(input) {
    const db = await createServerSupabase();
    const { data: auth } = await db.auth.getUser();
    if (!auth.user) return { ok: false, error: "Sign in to publish." };
    const { data, error } = await db
      .from("outfits")
      .insert({
        author_id: auth.user.id,
        title: input.title,
        code: input.code.trim(),
        class_name: input.className ?? null,
        armor: input.armor ?? null,
        race: input.race ?? null,
        category: input.category,
        tags: input.tags,
        gallery: input.gallery,
      })
      .select(OUTFIT_COLUMNS)
      .single();
    if (error?.code === REFUSED_BY_POLICY) return { ok: false, error: "Choose a public name first, from the account button." };
    if (error?.code === PUBLISHING_LIMIT) return { ok: false, error: "That is 20 looks this hour. Try again later." };
    if (error) return { ok: false, error: "That outfit could not be saved. Try again." };
    return { ok: true, value: toPost(data as unknown as OutfitRow) };
  },
  async upvote(id) {
    if (!UUID.test(id)) return { ok: false, error: "That look cannot be voted on." };
    const db = await createServerSupabase();
    const { data, error } = await db.rpc("upvote_outfit", { target: id });
    if (error?.code === SIGNED_OUT) return { ok: false, error: "Sign in to vote." };
    if (error) return { ok: false, error: "That vote could not be counted. Try again." };
    return { ok: true, value: data as number };
  },
  async uploadScreenshot(file) {
    const db = await createServerSupabase();
    const { data: auth } = await db.auth.getUser();
    if (!auth.user) return { ok: false, error: "Sign in to upload." };
    const compressed = await compressScreenshot(Buffer.from(await file.arrayBuffer()));
    if (!compressed) return { ok: false, error: "That file could not be read as an image." };
    // The first folder is the owner: the bucket's RLS policy checks exactly this.
    const path = `${auth.user.id}/${crypto.randomUUID()}.${SCREENSHOT_EXTENSION}`;
    const files = db.storage.from(SCREENSHOT_BUCKET);
    // Keeps Storage's one-hour cache. The Free plan cannot purge the CDN, so a longer
    // one would keep serving an image a moderator had deleted.
    const store = (to: string, body: Buffer) => files.upload(to, body, { contentType: SCREENSHOT_TYPE });
    // The thumbnail first: a post can only name the full file, so a failure here
    // can never leave a post pointing at half a screenshot.
    const thumb = await store(thumbOf(path), compressed.thumb);
    if (thumb.error) return uploadError(thumb.error.message);
    const full = await store(path, compressed.full);
    if (full.error) {
      await files.remove([thumbOf(path)]);
      return uploadError(full.error.message);
    }
    return { ok: true, value: path };
  },
  async removeScreenshot(path) {
    const db = await createServerSupabase();
    const { error } = await db.storage.from(SCREENSHOT_BUCKET).remove([path, thumbOf(path)]);
    if (error) return { ok: false, error: "That screenshot could not be removed." };
    return { ok: true, value: path };
  },
  async deleteOutfit(id) {
    if (!UUID.test(id)) return { ok: false, error: "That look cannot be deleted." };
    const db = await createServerSupabase();
    const { data: auth } = await db.auth.getUser();
    if (!auth.user) return { ok: false, error: "Sign in to delete a look." };
    const { data, error } = await db.from("outfits").delete().eq("id", id).select("gallery");
    if (error) return { ok: false, error: "That look could not be deleted. Try again." };
    // RLS answers a delete it refuses with no rows, not with an error.
    if (!data.length) return { ok: false, error: "You can only delete your own looks." };
    const paths = (data[0].gallery as string[]).flatMap((path) => [path, thumbOf(path)]);
    if (paths.length) await db.storage.from(SCREENSHOT_BUCKET).remove(paths);
    return { ok: true, value: id };
  },
  async getAccount() {
    const db = await createServerSupabase();
    const { data: auth } = await db.auth.getUser();
    if (!auth.user) return null;
    const { data } = await db
      .from("profiles")
      .select("display_name,moderators(user_id)")
      .eq("id", auth.user.id)
      .maybeSingle();
    return { id: auth.user.id, name: data?.display_name ?? null, moderator: Boolean(data?.moderators) };
  },
  async setDisplayName(name) {
    const db = await createServerSupabase();
    const { data: auth } = await db.auth.getUser();
    if (!auth.user) return { ok: false, error: "Sign in to choose a name." };
    const { data, error } = await db
      .from("profiles")
      .update({ display_name: name })
      .eq("id", auth.user.id)
      .select("display_name")
      .single();
    if (error?.code === UNIQUE_VIOLATION) return { ok: false, error: "That name is taken. Try another." };
    if (error) return { ok: false, error: "That name could not be saved. Try again." };
    return { ok: true, value: data.display_name };
  },
  async listWorldPresets(f: WorldFilters) {
    const db = await createServerSupabase();
    let query = db
      .from("world_presets")
      .select("id,title,look,blurb,code,places,place_group,profiles(display_name)")
      .order("created_at", { ascending: false })
      .limit(60);
    if (f.group) query = query.eq("place_group", f.group);
    if (f.look) query = query.eq("look", f.look);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    // Nothing on the site publishes a preset yet, so the table starts empty and
    // the overlay's own looks stay listed after it.
    const published = (data as unknown as PresetRow[]).map((r) => ({
      id: r.id,
      title: r.title,
      look: r.look,
      blurb: r.blurb,
      code: r.code,
      places: r.places,
      group: r.place_group,
      author: r.profiles?.display_name ?? null,
    })) satisfies WorldPreset[];
    return [...published, ...(await builtinRepository.listWorldPresets(f))];
  },
};
