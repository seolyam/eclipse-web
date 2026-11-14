import { NO_MENTIONS, type Embed } from "@/lib/discord";
import type { ShowcaseMessage } from "@/lib/showcase-post";

// What Discord sends the bot, and what the bot answers.

export interface CommandData {
  name: string;
  /** 1 a slash command, 3 a message's right-click menu. */
  type?: number;
  options?: { name: string; value: unknown; focused?: boolean }[];
  /** A right-clicked message, with the message itself under resolved. */
  target_id?: string;
  resolved?: { messages?: Record<string, ShowcaseMessage> };
}

export interface Interaction {
  type: number;
  application_id: string;
  token: string;
  guild_id?: string;
  channel_id?: string;
  /** In a server: who asked, with their permissions there. Signed by Discord, so trusted. */
  member?: { user: { id: string }; permissions?: string };
  data?: CommandData;
}

export const MESSAGE_COMMAND = 3;

/** Message flag: only the person who asked sees it. */
export const EPHEMERAL = 64;

export interface Reply {
  content?: string;
  embeds?: Embed[];
  components?: unknown[];
  flags?: number;
  allowed_mentions: typeof NO_MENTIONS;
}

/** A short answer only the asker sees. */
export const say = (content: string): Reply => ({ content, flags: EPHEMERAL, allowed_mentions: NO_MENTIONS });
