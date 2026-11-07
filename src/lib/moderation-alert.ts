import "server-only";
import { repository } from "@/lib/data";
import { REPORT_REASONS, type ReportReason } from "@/lib/data/types";
import { AMBER, plain, postWebhook } from "@/lib/discord";
import { siteUrl } from "@/lib/site";

// Tells the moderators' Discord channel (DISCORD_MOD_WEBHOOK_URL) that a look was
// reported. Only a person's first report of a look gets here. It names the look and
// the reason, never who reported it: that stays on the site, for moderators.
export async function alertModerators(id: string, reason: ReportReason) {
  const hook = process.env.DISCORD_MOD_WEBHOOK_URL;
  if (!hook) return;
  const post = await repository.getOutfit(id);
  if (!post) return;

  const url = `${siteUrl}/wardrobe/${post.id}`;
  const by = post.author ? ` by ${plain(post.author)}` : "";
  await postWebhook(hook, [{
    // Shown as typed, as the weekly post shows it. Mentions are off, so nothing pings.
    title: `Reported: ${post.title}`.slice(0, 256),
    url,
    description: `A look${by} was reported for **${REPORT_REASONS[reason]}**.\n[Review it in moderation](${siteUrl}/moderation)`,
    color: AMBER,
    ...(post.gallery.length ? { thumbnail: { url: `${url}/cover` } } : {}),
    footer: { text: "Report" },
  }]);
}
