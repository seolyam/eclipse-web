// Registers the bot's slash commands (src/lib/discord-commands.json) on the Eclipse
// server. Guild commands change at once, unlike global ones. Run it after changing
// that file:
//
//   node --env-file=.env.local tools/register-discord-commands.mjs
//
// It needs DISCORD_APP_ID, DISCORD_GUILD_ID and DISCORD_BOT_TOKEN. The token never
// leaves this machine except to Discord.
import { readFileSync } from "node:fs";

const { DISCORD_APP_ID: app, DISCORD_GUILD_ID: guild, DISCORD_BOT_TOKEN: token } = process.env;
if (!app || !guild || !token) {
  console.error("Set DISCORD_APP_ID, DISCORD_GUILD_ID and DISCORD_BOT_TOKEN first.");
  process.exit(1);
}

const commands = JSON.parse(readFileSync(new URL("../src/lib/discord-commands.json", import.meta.url), "utf8"));
const res = await fetch(`https://discord.com/api/v10/applications/${app}/guilds/${guild}/commands`, {
  method: "PUT",
  headers: { "Content-Type": "application/json", Authorization: `Bot ${token}` },
  body: JSON.stringify(commands),
});
if (!res.ok) {
  console.error("Discord refused the commands:", res.status, await res.text());
  process.exit(1);
}
console.log("Registered:", (await res.json()).map((c) => `/${c.name}`).join(", "));
