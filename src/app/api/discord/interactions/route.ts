import { after } from "next/server";
import { answer, quickReply, timing, type Reply } from "./commands";
import { verifyDiscord } from "./verify";

// Discord's Interactions Endpoint URL for the Eclipse app. Discord POSTs each slash
// command here, signed with the app's key, and waits three seconds for an answer. An
// answer ready in time goes straight back. A slower one answers "thinking" at once,
// then edits that message.

const PING = 1;
const COMMAND = 2;
const PONG = 1;
const MESSAGE = 4;
const DEFERRED = 5;

interface Interaction {
  type: number;
  application_id: string;
  token: string;
  data?: { name: string; options?: { name: string; value: unknown }[] };
}

const EDIT_TRIES = 4;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Edits the "thinking" message into the answer. Flags cannot change on an edit. An edit
 * can reach Discord before the thinking message exists, which it calls an unknown
 * webhook (404), so a 404 is tried again a few times.
 */
async function finish(interaction: Interaction, reply: Reply) {
  const message: Reply = { ...reply };
  delete message.flags;
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(
      `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`,
      { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(message) },
    );
    if (res.ok) return;
    if (res.status !== 404 || attempt >= EDIT_TRIES) {
      console.error("Discord refused a command answer:", res.status, await res.text());
      return;
    }
    await sleep(timing.retryMs * attempt);
  }
}

const FAILED: Reply = { content: "Eclipse could not answer that. Try again.", allowed_mentions: { parse: [] } };

export async function POST(request: Request) {
  // The signature covers the raw body, so it is checked before anything parses it.
  const body = await request.text();
  const key = process.env.DISCORD_PUBLIC_KEY ?? "";
  const signed = await verifyDiscord(
    key,
    request.headers.get("x-signature-ed25519"),
    request.headers.get("x-signature-timestamp"),
    body,
  );
  if (!signed) return new Response("Bad signature", { status: 401 });

  const interaction = JSON.parse(body) as Interaction;
  if (interaction.type === PING) return Response.json({ type: PONG });
  if (interaction.type !== COMMAND || !interaction.data) return new Response(null, { status: 400 });

  const data = interaction.data;
  const quick = quickReply(data);
  if (quick) return Response.json({ type: MESSAGE, data: quick });

  // A failure becomes the FAILED answer, so the work never rejects unhandled.
  const work = answer(data).catch((error) => {
    console.error("A Discord command failed:", error);
    return FAILED;
  });
  const inTime = await Promise.race([work, sleep(timing.inlineMs).then(() => null)]);
  if (inTime) return Response.json({ type: MESSAGE, data: inTime });

  after(async () => finish(interaction, await work));
  return Response.json({ type: DEFERRED });
}
