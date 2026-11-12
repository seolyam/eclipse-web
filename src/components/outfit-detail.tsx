import { BadgeCheck } from "lucide-react";
import Link from "next/link";
import { BookmarkButton } from "@/components/bookmark-button";
import { CopyButton } from "@/components/copy-button";
import { DeleteLook } from "@/components/delete-look";
import { LoadoutFacts } from "@/components/outfit-breakdown";
import { ReportLook } from "@/components/report-look";
import { ModeratorReports } from "@/components/moderator-reports";
import { SendToGame } from "@/components/send-to-game";
import { StudioPane } from "@/components/studio/studio-pane";
import { UpvoteButton } from "@/components/upvote-button";
import { resolveOutfit, type ResolvedOutfit } from "@/lib/catalog";
import { decodeOutfit } from "@/lib/codec/outfit";
import { repository } from "@/lib/data";
import type { OutfitPost } from "@/lib/data/types";
import { ARMOR_LABEL, RACE_LABEL, VISIBLE_SLOTS } from "@/lib/domain";

/** The Dressing room dresses visible slots only, so a pure morph or mount has nothing to open. */
const hasArmor = (r: ResolvedOutfit) => r.slots.some((s) => (VISIBLE_SLOTS as readonly number[]).includes(s.slot));

export async function OutfitDetail({
  post,
  heading = "h1",
  inDrawer = false,
}: {
  post: OutfitPost;
  heading?: "h1" | "h2";
  /** Shown in the Wardrobe drawer, which then offers the look's own page. */
  inDrawer?: boolean;
}) {
  // Only a published look has an author, and only those can be bookmarked or reported.
  const saved = post.authorId ? await repository.isBookmarked(post.id) : false;
  const decoded = decodeOutfit(post.code);
  const resolved = decoded.ok ? resolveOutfit(decoded.outfit) : null;
  const tags = [
    post.className,
    post.race ? RACE_LABEL[post.race] : null,
    post.armor ? ARMOR_LABEL[post.armor] : null,
    ...post.categories,
    ...post.tags,
  ].filter((t): t is string => Boolean(t));

  return (
    <div className="flex flex-col gap-5">
      {post.authorId && <ModeratorReports id={post.id} />}
      {resolved ? (
        <StudioPane post={post} resolved={resolved} heading={heading} />
      ) : (
        <p className="text-sm text-bad">This outfit&apos;s code no longer decodes.</p>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <CopyButton code={post.code} className="h-[2.9rem] flex-1 px-6 text-[0.95rem] sm:flex-none" />
        {repository.live && <SendToGame id={post.id} />}
        {post.upvotes !== null && <UpvoteButton id={post.id} count={post.upvotes} />}
        {repository.live && post.authorId && <BookmarkButton id={post.id} saved={saved} />}
        <p className="flex items-center gap-1 text-sm text-ink-dim">
          {post.authorId && post.author ? (
            <Link href={`/creators/${post.authorId}`} className="underline-offset-2 hover:text-ink hover:underline">{post.author}</Link>
          ) : (post.author ?? "Item set")}
          {post.authorVerified && <BadgeCheck className="size-3.5 text-amber" strokeWidth={1.5} aria-label="Verified" />}
        </p>
        {resolved && hasArmor(resolved) && (
          <Link href={`/dressing-room?look=${encodeURIComponent(post.id)}`} className="pill">
            Open in Dressing room
          </Link>
        )}
        {inDrawer && (
          // A plain link on purpose: a <Link> from the Wardrobe is intercepted again
          // and reopens this drawer, while a full load reaches the look's own page.
          <a href={`/wardrobe/${encodeURIComponent(post.id)}`} className="pill">
            Open full page
          </a>
        )}
        {post.authorId && <ReportLook id={post.id} authorId={post.authorId} />}
        {post.authorId && <DeleteLook id={post.id} authorId={post.authorId} />}
      </div>

      {post.remixedFrom && (
        <p className="text-sm text-ink-dim">
          Based on{" "}
          <Link href={`/wardrobe/${post.remixedFrom.id}`} className="text-amber underline underline-offset-2">{post.remixedFrom.title}</Link>
          {post.remixedFrom.author && <> by {post.remixedFrom.author}</>}
        </p>
      )}

      <ul className="flex flex-wrap gap-1">
        {tags.map((t) => (
          <li key={t} className="rounded-full bg-surface-high px-2.5 py-0.5 text-xs text-ink-dim">
            {t}
          </li>
        ))}
      </ul>

      {resolved && (
        <section aria-labelledby="morph-heading">
          <h3 id="morph-heading" className="mb-2 text-xs font-medium text-ink-faint">
            Body, mount, enchants and effects
          </h3>
          <LoadoutFacts resolved={resolved} />
        </section>
      )}

      <section aria-labelledby="raw-heading">
        <h3 id="raw-heading" className="mb-1 text-xs font-medium text-ink-faint">
          Raw code
        </h3>
        <pre className="max-h-28 overflow-auto rounded-md border border-line bg-surface p-2.5 font-mono text-xs leading-[18px] break-all whitespace-pre-wrap text-ink-dim">
          {post.code}
        </pre>
      </section>
    </div>
  );
}
