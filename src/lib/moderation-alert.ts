import "server-only";
import { repository } from "@/lib/data";
import {
  COMMENT_REPORT_REASONS, REPORT_REASONS, type CommentReportReason, type ReportReason,
} from "@/lib/data/types";
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

// The same channel, for a comment. The comment is quoted as typed, so moderators can
// judge it from Discord; mentions stay off, so nothing in it pings anyone.
export async function alertCommentReport(id: string, reason: CommentReportReason) {
  const hook = process.env.DISCORD_MOD_WEBHOOK_URL;
  if (!hook) return;
  const comment = await repository.getComment(id);
  if (!comment) return;
  const post = await repository.getOutfit(comment.outfitId);
  if (!post) return;

  const by = comment.author ? ` by ${plain(comment.author)}` : "";
  const quote = plain(comment.body.slice(0, 1000)).replace(/^/gm, "> ");
  await postWebhook(hook, [{
    title: `Reported comment on ${post.title}`.slice(0, 256),
    url: `${siteUrl}/wardrobe/${post.id}#comment-${comment.id}`,
    description:
      `A comment${by} was reported for **${COMMENT_REPORT_REASONS[reason]}**.\n${quote}\n` +
      `[Review it in moderation](${siteUrl}/moderation)`,
    color: AMBER,
    footer: { text: "Report" },
  }]);
}
