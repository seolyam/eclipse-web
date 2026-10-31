import "server-only";
import { LOOKS_PER_PAGE, type ArmorType, type Category, type ClassName, type WorldGroup, type WorldLookName } from "@/lib/domain";
import { createServerSupabase } from "@/lib/supabase/server";
import { builtinRepository } from "./builtin";
import type { OutfitFilters, OutfitList, OutfitPost, Repository, WorldFilters, WorldPreset } from "./types";

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
  gallery: string[];
  profiles: { display_name: string; verified: boolean } | null;
}

interface PresetRow {
  id: string;
  title: string;
  look: WorldLookName;
  blurb: string;
  code: string;
  places: string[];
  place_group: WorldGroup;
  profiles: { display_name: string } | null;
}

const OUTFIT_COLUMNS =
  "id,title,code,class_name,armor,race,category,tags,upvotes,created_at,gallery,profiles(display_name,verified)";

const toPost = (r: OutfitRow): OutfitPost => ({
  id: r.id,
  title: r.title,
  author: r.profiles?.display_name ?? null,
  authorVerified: r.profiles?.verified ?? false,
  code: r.code,
  className: r.class_name,
  armor: r.armor,
  race: r.race,
  category: r.category,
  tags: r.tags,
  upvotes: r.upvotes,
  createdAt: r.created_at,
  gallery: r.gallery,
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
const SEARCH_INDEX_SIZE = 200;

async function listOutfits(f: OutfitFilters): Promise<OutfitList> {
  const db = await createServerSupabase();
  const size = f.pageSize ?? LOOKS_PER_PAGE;
  const from = (Math.max(1, f.page ?? 1) - 1) * size;
  let query = db.from("outfits").select(OUTFIT_COLUMNS, { count: "exact" }).range(from, from + size - 1);
  if (f.captured) query = query.neq("gallery", "{}");
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
    if (!auth.user) return { ok: false, error: "Sign in with Discord to publish." };
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
    if (error) return { ok: false, error: "That outfit could not be saved. Try again." };
    return { ok: true, value: toPost(data as unknown as OutfitRow) };
  },
  async upvote(id) {
    if (!UUID.test(id)) return { ok: false, error: "That look cannot be voted on." };
    const db = await createServerSupabase();
    const { data, error } = await db.rpc("upvote_outfit", { target: id });
    if (error?.code === SIGNED_OUT) return { ok: false, error: "Sign in with Discord to vote." };
    if (error) return { ok: false, error: "That vote could not be counted. Try again." };
    return { ok: true, value: data as number };
  },
  async uploadScreenshot(file) {
    const db = await createServerSupabase();
    const { data: auth } = await db.auth.getUser();
    if (!auth.user) return { ok: false, error: "Sign in with Discord to upload." };
    // The first folder is the owner: the bucket's RLS policy checks exactly this.
    const path = `${auth.user.id}/${crypto.randomUUID()}.${file.type.split("/")[1]}`;
    const { error } = await db.storage.from("showcase").upload(path, file, { contentType: file.type });
    if (error) return { ok: false, error: "That screenshot could not be stored. Try again." };
    return { ok: true, value: db.storage.from("showcase").getPublicUrl(path).data.publicUrl };
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
