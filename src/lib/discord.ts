// What the site sends to the community Discord. Every message turns mentions off, so a
// look's title or a name can never ping @everyone or anyone else.

/** Discord reads embed text as markdown. A name or title is shown as typed. */
export const plain = (text: string) => text.replace(/([\\*_~`|>[\]()#-])/g, "\\$1");

/** The site's amber, as Discord wants it: one number. */
export const AMBER = 0xf2a93b;

export const NO_MENTIONS = { parse: [] as string[] };

export interface Embed {
  title?: string;
  url?: string;
  description?: string;
  color?: number;
  image?: { url: string };
  thumbnail?: { url: string };
  footer?: { text: string };
  fields?: { name: string; value: string; inline?: boolean }[];
}

/** Posts to a channel webhook. False, and a log line, when Discord refuses it. */
export async function postWebhook(hook: string, embeds: Embed[]): Promise<boolean> {
  const res = await fetch(hook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ allowed_mentions: NO_MENTIONS, embeds }),
  });
  if (!res.ok) console.error("Discord refused a webhook post:", res.status, await res.text());
  return res.ok;
}
