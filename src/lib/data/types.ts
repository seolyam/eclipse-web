import type { ArmorType, Category, ClassName, Sort } from "@/lib/domain";
import type { ParsedOutfit } from "@/lib/codec/schema";

export interface OutfitPost {
  id: string;
  title: string;
  /** Who published it. Null on a set from the game's catalogue: nobody did. */
  author: string | null;
  authorId: string | null;
  authorVerified: boolean;
  /** The ECA1: code exactly as published. Everything else is about it. */
  code: string;
  className: ClassName | null;
  armor: ArmorType | null;
  /** A key of RACE_LABEL. */
  race: string | null;
  category: Category;
  tags: string[];
  /** Null where nobody can vote: the site never shows a count it did not record. */
  upvotes: number | null;
  createdAt: string | null;
  /** Links to studio screenshots, the cover first. The code holds no pictures. */
  gallery: string[];
  /** The look this one was made from in the Dressing room, while it can still be seen. */
  remixedFrom?: { id: string; title: string; author: string | null } | null;
}

/** Someone who has chosen a public name. Every count is of what visitors can see. */
export interface Creator {
  id: string;
  name: string;
  verified: boolean;
  joinedAt: string;
  looks: number;
  upvotes: number;
}

export interface OutfitFilters {
  q?: string;
  className?: ClassName | null;
  race?: string | null;
  armor?: ArmorType | null;
  category?: Category | null;
  tag?: string | null;
  /** Only looks with a real studio capture: what the Showcase lists. */
  captured?: boolean;
  /** Only looks this account published. */
  authorId?: string | null;
  /** Only looks the signed-in account bookmarked. */
  saved?: boolean;
  /** Only looks wearing this item. */
  item?: number | null;
  sort: Sort;
  /** From 1. */
  page?: number;
  /** LOOKS_PER_PAGE unless set. */
  pageSize?: number;
}

export interface OutfitList {
  posts: OutfitPost[];
  /** Everything the filters match, across all pages. */
  total: number;
}

export interface SearchEntry {
  id: string;
  title: string;
  author: string | null;
}

export interface Account {
  id: string;
  /** Null until they choose one. */
  name: string | null;
  /** From the sign-in provider. Shown to the account's owner only. */
  avatar: string | null;
  provider: string | null;
  /** May delete any look, not only their own. */
  moderator: boolean;
}

/** A game linked to an account. Only its owner ever sees this. */
export interface GameLink {
  id: string;
  /** The character and realm that last synced. Empty until one has. */
  label: string;
  linkedAt: string;
  lastSyncAt: string | null;
}

/** A look saved in the game or sent to it from here. Private until it is published. */
export interface GameSet {
  id: string;
  name: string;
  code: string;
  updatedAt: string;
}

export const REPORT_REASONS = {
  spam: "Spam or advertising",
  offensive: "Offensive title or screenshot",
  stolen: "Someone else's look, reposted",
  broken: "Not a real look, or the code is broken",
  other: "Something else",
} as const;

export type ReportReason = keyof typeof REPORT_REASONS;

/** A look with reports no moderator has reviewed yet. Moderators only. */
export interface ReportedLook {
  id: string;
  title: string;
  reports: number;
  reasons: ReportReason[];
  lastReport: string;
}

export type WriteResult<T> = { ok: true; value: T } | { ok: false; error: string };

/** The seam: pages know this and nothing about where the rows live. */
export interface Repository {
  /** False on the built-in looks: nothing can be published, voted on or stored. */
  readonly live: boolean;
  listOutfits(filters: OutfitFilters): Promise<OutfitList>;
  getOutfit(id: string): Promise<OutfitPost | null>;
  /** The most upvoted look of the last seven days, or null when no look has earned it. */
  lookOfTheWeek(): Promise<{ post: OutfitPost; votes: number } | null>;
  /** A creator's public page. Null for an unknown id or someone with no public name. */
  getCreator(id: string): Promise<Creator | null>;
  searchIndex(): Promise<SearchEntry[]>;
  createOutfit(input: ParsedOutfit): Promise<WriteResult<OutfitPost>>;
  upvote(id: string): Promise<WriteResult<number>>;
  /** Files a report for moderators. A report never hides the look by itself. */
  report(id: string, reason: ReportReason): Promise<WriteResult<string>>;
  /** Whether the signed-in account bookmarked this look. False for a visitor. */
  isBookmarked(id: string): Promise<boolean>;
  setBookmark(id: string, saved: boolean): Promise<WriteResult<boolean>>;
  /** Moderators only: everything else gets an empty list. */
  listReports(): Promise<ReportedLook[]>;
  /** Moderators only: keeps a reported look and marks its reports so far as read. */
  dismissReports(id: string): Promise<WriteResult<string>>;
  /** Compresses and stores a screenshot, and returns its storage path. */
  uploadScreenshot(file: File): Promise<WriteResult<string>>;
  removeScreenshot(path: string): Promise<WriteResult<string>>;
  /** Removes a look and its screenshots: the author's own, or any for a moderator. */
  deleteOutfit(id: string): Promise<WriteResult<string>>;
  /** Who is signed in, or null for a visitor. */
  getAccount(): Promise<Account | null>;
  setDisplayName(name: string): Promise<WriteResult<string>>;
  listGameLinks(): Promise<GameLink[]>;
  listGameSets(): Promise<GameSet[]>;
  getGameSet(id: string): Promise<GameSet | null>;
  /** A short code for the game to trade for its own token. It lasts ten minutes. */
  newGameLinkCode(): Promise<WriteResult<{ code: string; expiresAt: string }>>;
  unlinkGame(id: string): Promise<WriteResult<string>>;
  /** Files a look with the player's sets, where their next sync picks it up. */
  sendToGame(title: string, code: string): Promise<WriteResult<{ name: string; linked: boolean }>>;
  removeGameSet(id: string): Promise<WriteResult<string>>;
}
