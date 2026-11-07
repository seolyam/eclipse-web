import { after } from "next/server";
import { answer, quickReply, type Reply } from "./commands";
import { verifyDiscord } from "./verify";

// Discord's Interactions Endpoint URL for the Eclipse app. Discord POSTs each slash
// command here, signed with the app's key, and waits three seconds for an answer. A
// command that reads the database answers "thinking" at once, then edits that message.

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

/** Edits the "thinking" message into the answer. Flags cannot change on an edit. */
async function finish(interaction: Interaction, reply: Reply) {
  const message: Reply = { ...reply };
  delete message.flags;
  const res = await fetch(
    `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`,
    { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(message) },
  );
  if (!res.ok) console.error("Discord refused a command answer:", res.status, await res.text());
}

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

  after(async () => {
    try {
      await finish(interaction, await answer(data));
    } catch (error) {
      console.error("A Discord command failed:", error);
      await finish(interaction, { content: "Eclipse could not answer that. Try again.", allowed_mentions: { parse: [] } });
    }
  });
  return Response.json({ type: DEFERRED });
}
