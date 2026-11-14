import "server-only";
import { repository } from "@/lib/data";
import type { OutfitPost, SearchEntry } from "@/lib/data/types";
import { AMBER, NO_MENTIONS, plain } from "@/lib/discord";
import { codeIn } from "@/lib/showcase-post";
import { siteUrl } from "@/lib/site";
import { addToWardrobe } from "./add-to-wardrobe";
import { decodeReply } from "./decode";
import { MESSAGE_COMMAND, say, type CommandData, type Interaction, type Reply } from "./reply";

export { EPHEMERAL, type Interaction, type Reply } from "./reply";

// The answers to the bot's commands (src/lib/discord-commands.json). Each one shows
// only what the site shows a visitor: public looks, public names.

/**
 * inlineMs: how long an answer may take and still go straight back, under Discord's
 * three-second limit. retryMs: the wait before editing in a slow answer again, while
 * Discord has not yet made its "thinking" message. indexMs: how long /look's
 * suggestions reuse the list of looks. Tests shorten all three.
 */
export const timing = { inlineMs: 2000, retryMs: 1000, indexMs: 60_000 };

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

const option = (data: CommandData, name: string) => {
  const value = data.options?.find((o) => o.name === name)?.value;
  return typeof value === "string" ? value : "";
};

/** The right-clicked message, which Discord sends along with the click. */
const target = (data: CommandData) => (data.target_id ? data.resolved?.messages?.[data.target_id] : undefined);

const DECODE_MESSAGE = "Decode Eclipse code";
const ADD_TO_WARDROBE = "Add to Wardrobe";

/** A right-click answers the asker alone, so it never fills a channel. */
export const isQuiet = (data: CommandData) => data.type === MESSAGE_COMMAND;

/** Answers that need no database, sent straight back. Null when the command needs one. */
export function quickReply(interaction: Interaction): Reply | null {
  const data = interaction.data;
  if (!data) return say("Discord sent no command.");
  if (data.name === "look" && !lookId(option(data, "look"))) {
    return say("Paste a look's link from the Wardrobe, or its id.");
  }
  if (data.name === "decode") return decodeReply(option(data, "code"), { quiet: false });
  if (data.name === DECODE_MESSAGE) {
    const code = codeIn(target(data)?.content ?? "");
    return code ? decodeReply(code, { quiet: true }) : say("That message holds no Eclipse code.");
  }
  if (!["look", "wardrobe", ADD_TO_WARDROBE].includes(data.name)) return say("That command is not part of Eclipse anymore.");
  return null;
}

/** The full answer, for a command quickReply let through. */
export async function answer(interaction: Interaction): Promise<Reply> {
  const data = interaction.data!;
  if (data.name === ADD_TO_WARDROBE) return addToWardrobe(interaction);
  if (data.name === "wardrobe") return searchReply(option(data, "search"));
  const id = lookId(option(data, "look"));
  const post = id ? await repository.getOutfit(id) : null;
  return post ? lookReply(post) : say("No look in the Wardrobe has that link.");
}

let index: { at: number; entries: SearchEntry[] } | null = null;

/** The Wardrobe's search list, reused for a minute: suggestions come at every keystroke. */
async function searchList(): Promise<SearchEntry[]> {
  if (!index || Date.now() - index.at >= timing.indexMs) {
    index = { at: Date.now(), entries: await repository.searchIndex() };
  }
  return index.entries;
}

const CHOICES = 25;
const MAX_CHOICE = 100;

/** /look's suggestions for what is typed so far: Discord shows the name and sends the id. */
export async function suggest(data: CommandData): Promise<{ name: string; value: string }[]> {
  const typed = data.options?.find((o) => o.focused)?.value;
  if (data.name !== "look" || typeof typed !== "string") return [];
  const words = typed.toLowerCase().split(/\s+/).filter(Boolean);
  return (await searchList())
    .filter((entry) => {
      const text = `${entry.title} ${entry.author ?? ""}`.toLowerCase();
      return words.every((w) => text.includes(w));
    })
    .slice(0, CHOICES)
    .map((entry) => {
      const name = `${entry.title}${entry.author ? ` by ${entry.author}` : ""}`;
      return { name: name.length > MAX_CHOICE ? `${name.slice(0, MAX_CHOICE - 1)}…` : name, value: entry.id };
    });
}
