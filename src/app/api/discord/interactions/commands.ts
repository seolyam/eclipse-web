import "server-only";
import { repository } from "@/lib/data";
import type { OutfitPost } from "@/lib/data/types";
import { AMBER, NO_MENTIONS, plain, type Embed } from "@/lib/discord";
import { siteUrl } from "@/lib/site";

// The answers to the bot's slash commands (src/lib/discord-commands.json). Each one
// shows only what the site shows a visitor: public looks, public names.

/** Message flag: only the person who asked sees it. */
export const EPHEMERAL = 64;

/**
 * inlineMs: how long an answer may take and still go straight back, under Discord's
 * three-second limit. retryMs: the wait before editing in a slow answer again, while
 * Discord has not yet made its "thinking" message. Tests shorten both.
 */
export const timing = { inlineMs: 2000, retryMs: 1000 };

export interface Reply {
  content?: string;
  embeds?: Embed[];
  components?: unknown[];
  flags?: number;
  allowed_mentions: typeof NO_MENTIONS;
}

const say = (content: string): Reply => ({ content, flags: EPHEMERAL, allowed_mentions: NO_MENTIONS });

/** A look's id from its link or the id itself. Null for anything else. */
export function lookId(text: string): string | null {
  const t = text.trim();
  const fromLink = /\/wardrobe\/([\w-]{1,64})(?:[/?#]|$)/.exec(t);
  if (fromLink) return fromLink[1];
  return /^[\w-]{1,64}$/.test(t) ? t : null;
}

/** Discord shows a code block with a copy button; past this, the site is the place to copy it. */
const MAX_CODE = 1000;

function lookReply(post: OutfitPost): Reply {
  const url = `${siteUrl}/wardrobe/${post.id}`;
  const facts = [
    post.author ? `by ${plain(post.author)}` : null,
    post.upvotes != null ? `${post.upvotes.toLocaleString("en-US")} upvotes` : null,
  ].filter(Boolean);
  const code = post.code.length <= MAX_CODE
    ? `\`\`\`\n${post.code}\n\`\`\``
    : "Copy its code from the Wardrobe.";
  return {
    embeds: [{
      title: post.title.slice(0, 256),
      url,
      description: [facts.join(" · "), code].filter(Boolean).join("\n"),
      color: AMBER,
      ...(post.gallery.length ? { image: { url: `${url}/cover` } } : {}),
      footer: { text: "Wear it with Eclipse" },
    }],
    components: [{ type: 1, components: [{ type: 2, style: 5, label: "Open in the Wardrobe", url }] }],
    allowed_mentions: NO_MENTIONS,
  };
}

const RESULTS = 5;

async function searchReply(query: string): Promise<Reply> {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return say("Type a few words from a look's title or its creator's name.");
  const matches = (await repository.searchIndex()).filter((entry) => {
    const text = `${entry.title} ${entry.author ?? ""}`.toLowerCase();
    return words.every((w) => text.includes(w));
  });
  if (!matches.length) return say(`No looks match “${query.slice(0, 100)}”.`);
  const lines = matches.slice(0, RESULTS).map((entry) => {
    const by = entry.author ? ` by ${plain(entry.author)}` : "";
    return `[${plain(entry.title)}](${siteUrl}/wardrobe/${entry.id})${by}`;
  });
  const more = matches.length > RESULTS
    ? `\n[See all ${matches.length.toLocaleString("en-US")} in the Wardrobe](${siteUrl}/wardrobe?q=${encodeURIComponent(query)})`
    : "";
  return {
    embeds: [{
      title: `Looks matching “${query.slice(0, 100)}”`,
      description: lines.join("\n") + more,
      color: AMBER,
    }],
    allowed_mentions: NO_MENTIONS,
  };
}

interface CommandData {
  name: string;
  options?: { name: string; value: unknown }[];
}

const option = (data: CommandData, name: string) => {
  const value = data.options?.find((o) => o.name === name)?.value;
  return typeof value === "string" ? value : "";
};

/** Answers that need no database, sent straight back. Null when the command needs one. */
export function quickReply(data: CommandData): Reply | null {
  if (data.name === "look" && !lookId(option(data, "look"))) {
    return say("Paste a look's link from the Wardrobe, or its id.");
  }
  if (data.name !== "look" && data.name !== "wardrobe") return say("That command is not part of Eclipse anymore.");
  return null;
}

/** The full answer, for a command quickReply let through. */
export async function answer(data: CommandData): Promise<Reply> {
  if (data.name === "wardrobe") return searchReply(option(data, "search"));
  const id = lookId(option(data, "look"));
  const post = id ? await repository.getOutfit(id) : null;
  return post ? lookReply(post) : say("No look in the Wardrobe has that link.");
}
