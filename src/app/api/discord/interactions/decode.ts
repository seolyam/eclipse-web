import "server-only";
import { resolveOutfit } from "@/lib/catalog";
import { decodeOutfit } from "@/lib/codec/outfit";
import { AMBER, NO_MENTIONS, plain } from "@/lib/discord";
import { siteUrl } from "@/lib/site";
import { EPHEMERAL, say, type Reply } from "./reply";

// /decode and "Decode Eclipse code": what a code wears, read by name from the catalogue,
// as the Loadouts page shows it. Nothing is drawn, so nothing is read from the pack host.

/** Discord refuses a link button's address past this. */
const MAX_LINK = 512;
const MAX_DESCRIPTION = 4000;

export function decodeReply(text: string, { quiet }: { quiet: boolean }): Reply {
  const decoded = decodeOutfit(text);
  if (!decoded.ok) return say(decoded.error);
  const r = resolveOutfit(decoded.outfit);

  const lines: string[] = [];
  if (r.race) lines.push(`**Race** · ${r.race}${r.sex ? `, ${r.sex.toLowerCase()}` : ""}`);
  if (r.morph) lines.push(`**Morph** · ${r.morphName ? plain(r.morphName) : `display ${r.morph}`}`);
  for (const s of r.slots) {
    lines.push(`**${s.label}** · ${s.item === 0 ? "hidden" : s.name ? plain(s.name) : `item ${s.item}`}`);
  }
  for (const g of r.glows) lines.push(`**${g.hand} enchant** · ${g.name ? plain(g.name) : `enchant ${g.id}`}`);
  if (r.mount) lines.push(`**Mount** · ${r.mount.name ? plain(r.mount.name) : `display ${r.mount.id}`}`);
  if (r.mountFly) lines.push(`**Flying mount** · ${r.mountFly.name ? plain(r.mountFly.name) : `display ${r.mountFly.id}`}`);
  const extras = [
    r.scale ? `scale ${r.scale}` : null,
    r.colours.length ? `${r.colours.length} colour change${r.colours.length === 1 ? "" : "s"}` : null,
    r.tints ? `${r.tints} recoloured piece${r.tints === 1 ? "" : "s"}` : null,
    r.cosmetics ? `${r.cosmetics} 3D effect${r.cosmetics === 1 ? "" : "s"}` : null,
  ].filter(Boolean);
  if (extras.length) lines.push(`**Also** · ${extras.join(", ")}`);

  let description = lines.join("\n") || "This code changes nothing on its own.";
  if (description.length > MAX_DESCRIPTION) description = `${description.slice(0, MAX_DESCRIPTION)}…`;
  const open = `${siteUrl}/loadouts?code=${encodeURIComponent(text.trim())}`;
  return {
    embeds: [{ title: "What this code wears", description, color: AMBER, footer: { text: "Wear it with Eclipse" } }],
    ...(open.length <= MAX_LINK
      ? { components: [{ type: 1, components: [{ type: 2, style: 5, label: "Open in Loadouts", url: open }] }] }
      : {}),
    ...(quiet ? { flags: EPHEMERAL } : {}),
    allowed_mentions: NO_MENTIONS,
  };
}
