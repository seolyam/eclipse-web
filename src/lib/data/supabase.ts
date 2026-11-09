import "server-only";
import { LOOKS_PER_PAGE, type ArmorType, type Category, type ClassName } from "@/lib/domain";
import { hashSecret, newLinkCode } from "@/lib/game-sync/secrets";
import { cleanSetName } from "@/lib/game-sync/wire";
import { SCREENSHOT_BUCKET, screenshotUrl, thumbOf } from "@/lib/screenshots";
import { createServerSupabase } from "@/lib/supabase/server";
import { builtinRepository, matchingLooks } from "./builtin";
import { compressScreenshot, SCREENSHOT_EXTENSION, SCREENSHOT_TYPE } from "./compress";
import type {
  GameLink, GameSet, OutfitFilters, OutfitList, OutfitPost, ReportReason, Repository, WriteResult,
} from "./types";

// The same seam as builtin.ts, over supabase/migrations. RLS is what protects the
// rows: this file holds no rule the database does not enforce.

interface OutfitRow {
  id: string;
  title: string;
  code: string;
  class_name: ClassName | null;
  armor: ArmorType | null;
  race: string | null;
  categories: Category[];
  tags: string[];
  upvotes: number;
  created_at: string;
  author_id: string;
  gallery: string[];
  profiles: { display_name: string | null; verified: boolean } | null;
  remix?: { id: string; title: string; profiles: { display_name: string | null } | null } | null;
}

interface ReportedRow {
  outfit_id: string;
  title: string;
  reports: number;
  reasons: ReportReason[];
  last_report: string;
}

interface GameLinkRow {
  id: string;
  label: string;
  created_at: string;
  last_sync_at: string | null;
}

interface GameSetRow {
  id: string;
  name: string;
  code: string;
  updated_at: string;
  gallery: string[];
}

const toGameSet = (r: GameSetRow): GameSet => ({
  id: r.id,
  name: r.name,
  code: r.code,
  updatedAt: r.updated_at,
  gallery: r.gallery,
});

// The hint is required: outfit_votes, outfit_reports and outfit_bookmarks also join
// outfits to profiles, and PostgREST refuses a bare profiles(...) embed as ambiguous.
const OUTFIT_COLUMNS =
  "id,title,code,class_name,armor,race,categories,tags,upvotes,created_at,author_id,gallery,profiles!outfits_author_id_fkey(display_name,verified)," +
  // outfits refers to itself, so the hint is the column: it picks the original, not the remixes.
  "remix:outfits!remixed_from(id,title,profiles!outfits_author_id_fkey(display_name))";

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
  categories: r.categories,
  tags: r.tags,
  upvotes: r.upvotes,
  createdAt: r.created_at,
  gallery: r.gallery.map(screenshotUrl),
  remixedFrom: r.remix ? { id: r.remix.id, title: r.remix.title, author: r.remix.profiles?.display_name ?? null } : null,
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

/** People can edit their own user metadata, so this is only a suggestion. */
const safeAvatar = (url: unknown) => (typeof url === "string" && url.startsWith("https://") ? url : null);

const outfitRows = (
  db: Awaited<ReturnType<typeof createServerSupabase>>,
  f: OutfitFilters,
  columns: string,
  options: { count: "exact"; head?: boolean },
  savedBy: string | null,
) => {
  // An inner embed keeps only the outfits with a matching bookmark row.
  let query = savedBy
    ? db.from("outfits").select(`${columns},outfit_bookmarks!inner(user_id)`, options).eq("outfit_bookmarks.user_id", savedBy)
    : db.from("outfits").select(columns, options);
  if (f.captured) query = query.neq("gallery", "{}");
  if (f.authorId) query = query.eq("author_id", f.authorId);
  if (f.className) query = query.eq("class_name", f.className);
  if (f.race) query = query.eq("race", f.race);
  if (f.armor) query = query.eq("armor", f.armor);
  // categories is written by a trigger from the code (the look_categories migration).
  if (f.category) query = query.contains("categories", [f.category]);
  if (f.tag) query = query.contains("tags", [f.tag]);
  // items is written by a trigger from the code (the look_items migration).
  if (f.item) query = query.contains("items", [f.item]);
  const term = f.q ? safeTerm(f.q) : "";
  if (term) query = query.ilike("title", `%${term}%`);
  return query;
};

async function publishedOutfits(f: OutfitFilters): Promise<OutfitList> {
  const db = await createServerSupabase();
  let savedBy: string | null = null;
  if (f.saved) {
    const { data: auth } = await db.auth.getUser();
    if (!auth.user) return { posts: [], total: 0 };
    savedBy = auth.user.id;
  }
  const size = f.pageSize ?? LOOKS_PER_PAGE;
  const from = (Math.max(1, f.page ?? 1) - 1) * size;
  const page = outfitRows(db, f, OUTFIT_COLUMNS, { count: "exact" }, savedBy).range(from, from + size - 1);
  const query =
    f.sort === "newest"
      ? page.order("created_at", { ascending: false })
      : f.sort === "top"
        ? page.order("upvotes", { ascending: false })
        : page.order("trending_score", { ascending: false });
  const { data, error, count } = await query;
  if (error?.code === RANGE_NOT_SATISFIABLE) {
    // The refusal holds no count, and the caller pages on past the last row.
    const { count: rows, error: failed } = await outfitRows(db, f, "id", { count: "exact", head: true }, savedBy);
    if (failed) throw new Error(failed.message);
    return { posts: [], total: rows ?? 0 };
  }
  if (error) throw new Error(error.message);
  return { posts: (data as unknown as OutfitRow[]).map(toPost), total: count ?? 0 };
}

/** Published looks, then the game's own sets when asked for, as one list to page through. */
async function listOutfits(f: OutfitFilters): Promise<OutfitList> {
  if (!f.itemSets) return publishedOutfits(f);
  const size = f.pageSize ?? LOOKS_PER_PAGE;
  const from = (Math.max(1, f.page ?? 1) - 1) * size;
  const published = await publishedOutfits(f);
  const sets = matchingLooks(f);
  const start = Math.max(0, from - published.total);
  return {
    posts: [...published.posts, ...sets.slice(start, start + size - published.posts.length)],
    total: published.total + sets.length,
  };
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
  async lookOfTheWeek() {
    const db = await createServerSupabase();
    const { data, error } = await db.rpc("look_of_the_week");
    // An extra on the home page: a failure here leaves the section out, not the page.
    if (error) {
      console.error("Look of the week failed:", error.message);
      return null;
    }
    const pick = (data as { outfit_id: string; votes: number }[])[0];
    if (!pick) return null;
    const post = await supabaseRepository.getOutfit(pick.outfit_id);
    return post ? { post, votes: Number(pick.votes) } : null;
  },
  async getCreator(id) {
    if (!UUID.test(id)) return null;
    const db = await createServerSupabase();
    // RLS limits the looks to what this visitor can see, so a hidden look is not counted.
    const [profile, looks] = await Promise.all([
      db.from("profiles").select("display_name,verified,created_at").eq("id", id).maybeSingle(),
      db.from("outfits").select("upvotes").eq("author_id", id),
    ]);
    if (profile.error) throw new Error(profile.error.message);
    if (looks.error) throw new Error(looks.error.message);
    if (!profile.data?.display_name) return null;
    return {
      id,
      name: profile.data.display_name,
      verified: profile.data.verified,
      joinedAt: profile.data.created_at,
      looks: looks.data.length,
      upvotes: looks.data.reduce((sum, r) => sum + r.upvotes, 0),
    };
  },
  async searchIndex() {
    const { posts } = await publishedOutfits({ sort: "top", pageSize: SEARCH_INDEX_SIZE });
    const published = posts.map(({ id, title, author }) => ({ id, title, author }));
    return [...published, ...(await builtinRepository.searchIndex())];
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
        tags: input.tags,
        gallery: input.gallery,
        remixed_from: input.remixedFrom ?? null,
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
  async report(id, reason) {
    if (!UUID.test(id)) return { ok: false, error: "That look cannot be reported." };
    const db = await createServerSupabase();
    const { data, error } = await db.rpc("report_outfit", { target: id, why: reason });
    if (error?.code === SIGNED_OUT) return { ok: false, error: "Sign in to report a look." };
    if (error) return { ok: false, error: "That report could not be sent. Try again." };
    return { ok: true, value: data === true };
  },
  async isBookmarked(id) {
    if (!UUID.test(id)) return false;
    const db = await createServerSupabase();
    const { data: auth } = await db.auth.getUser();
    if (!auth.user) return false;
    const { data } = await db
      .from("outfit_bookmarks")
      .select("outfit_id")
      .eq("user_id", auth.user.id)
      .eq("outfit_id", id)
      .maybeSingle();
    return Boolean(data);
  },
  async setBookmark(id, saved) {
    if (!UUID.test(id)) return { ok: false, error: "That look cannot be bookmarked." };
    const db = await createServerSupabase();
    const { data: auth } = await db.auth.getUser();
    if (!auth.user) return { ok: false, error: "Sign in to bookmark a look." };
    const { error } = saved
      ? await db.from("outfit_bookmarks").insert({ user_id: auth.user.id, outfit_id: id })
      : await db.from("outfit_bookmarks").delete().eq("user_id", auth.user.id).eq("outfit_id", id);
    // A double click lands the same bookmark twice; the first one already saved it.
    if (error && error.code !== UNIQUE_VIOLATION) return { ok: false, error: "That bookmark could not be saved. Try again." };
    return { ok: true, value: saved };
  },
  async listReports() {
    const db = await createServerSupabase();
    const { data, error } = await db.rpc("moderation_queue");
    if (error?.code === REFUSED_BY_POLICY) return [];
    if (error) throw new Error(error.message);
    return (data as ReportedRow[]).map((r) => ({
      id: r.outfit_id,
      title: r.title,
      reports: Number(r.reports),
      reasons: r.reasons,
      lastReport: r.last_report,
    }));
  },
  async dismissReports(id) {
    if (!UUID.test(id)) return { ok: false, error: "That look has no reports to dismiss." };
    const db = await createServerSupabase();
    const { error } = await db.rpc("dismiss_reports", { target: id });
    if (error?.code === REFUSED_BY_POLICY) return { ok: false, error: "Only moderators can dismiss reports." };
    if (error) return { ok: false, error: "Those reports could not be dismissed. Try again." };
    return { ok: true, value: id };
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
    return {
      id: auth.user.id,
      name: data?.display_name ?? null,
      avatar: safeAvatar(auth.user.user_metadata?.avatar_url),
      provider: auth.user.app_metadata?.provider ?? null,
      moderator: Boolean(data?.moderators),
    };
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
  async listGameLinks() {
    const db = await createServerSupabase();
    const { data, error } = await db
      .from("game_links")
      .select("id,label,created_at,last_sync_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data as GameLinkRow[]).map((r): GameLink => ({
      id: r.id,
      label: r.label,
      linkedAt: r.created_at,
      lastSyncAt: r.last_sync_at,
    }));
  },
  async listGameSets() {
    const db = await createServerSupabase();
    const { data, error } = await db
      .from("game_sets")
      .select("id,name,code,updated_at,gallery")
      .not("code", "is", null)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data as GameSetRow[]).map(toGameSet);
  },
  async getGameSet(id) {
    if (!UUID.test(id)) return null;
    const db = await createServerSupabase();
    const { data, error } = await db
      .from("game_sets")
      .select("id,name,code,updated_at,gallery")
      .eq("id", id)
      .not("code", "is", null)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toGameSet(data as GameSetRow) : null;
  },
  async newGameLinkCode() {
    const db = await createServerSupabase();
    const code = newLinkCode();
    const { data, error } = await db.rpc("game_link_new", { p_code_hash: hashSecret(code) });
    if (error) return { ok: false, error: "Sign in to link your game." };
    return { ok: true, value: { code, expiresAt: data as string } };
  },
  async unlinkGame(id) {
    const db = await createServerSupabase();
    const { error } = await db.from("game_links").delete().eq("id", id);
    if (error) return { ok: false, error: "That game could not be unlinked. Try again." };
    return { ok: true, value: id };
  },
  async sendToGame(title, code) {
    const db = await createServerSupabase();
    const { data: auth } = await db.auth.getUser();
    if (!auth.user) return { ok: false, error: "Sign in to send looks to your game." };
    const { data, error } = await db.rpc("game_set_send", { p_name: cleanSetName(title), p_code: code });
    if (error) return { ok: false, error: "That look could not be sent. Try again." };
    if (!data) return { ok: false, error: "Your sets are full. Remove one to make room." };
    return { ok: true, value: data as { name: string; linked: boolean } };
  },
  async removeGameSet(id) {
    const db = await createServerSupabase();
    const { error } = await db.rpc("game_set_remove", { p_id: id });
    if (error) return { ok: false, error: "That set could not be removed. Try again." };
    await supabaseRepository.clearOrphanPictures();
    return { ok: true, value: id };
  },
  async removeSetPicture(setId, path) {
    if (!UUID.test(setId)) return { ok: false, error: "That picture could not be removed." };
    const db = await createServerSupabase();
    const { error } = await db.rpc("game_set_drop_shot", { p_set: setId, p_path: path });
    if (error) return { ok: false, error: "That picture could not be removed. Try again." };
    await supabaseRepository.clearOrphanPictures();
    return { ok: true, value: path };
  },
  async clearOrphanPictures() {
    // Best effort: an orphan left behind is tried again on the next visit to the sets.
    const db = await createServerSupabase();
    const { data, error } = await db.rpc("game_shot_orphans");
    const paths = (data as string[] | null) ?? [];
    if (error || !paths.length) return;
    const removed = await db.storage.from(SCREENSHOT_BUCKET).remove(paths.flatMap((p) => [p, thumbOf(p)]));
    if (removed.error) {
      console.error("Clearing old set pictures failed:", removed.error.message);
      return;
    }
    await db.rpc("game_shot_forget", { p_paths: paths });
  },
};
