import { BadgeCheck } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { DeleteLook } from "@/components/delete-look";
import { LoadoutFacts } from "@/components/outfit-breakdown";
import { StudioPane } from "@/components/studio/studio-pane";
import { UpvoteButton } from "@/components/upvote-button";
import { resolveOutfit } from "@/lib/catalog";
import { decodeOutfit } from "@/lib/codec/outfit";
import type { OutfitPost } from "@/lib/data/types";
import { ARMOR_LABEL, RACE_LABEL } from "@/lib/domain";

export function OutfitDetail({ post, heading = "h1" }: { post: OutfitPost; heading?: "h1" | "h2" }) {
  const decoded = decodeOutfit(post.code);
  const resolved = decoded.ok ? resolveOutfit(decoded.outfit) : null;
  const tags = [
    post.className,
    post.race ? RACE_LABEL[post.race] : null,
    post.armor ? ARMOR_LABEL[post.armor] : null,
    post.category,
    ...post.tags,
  ].filter((t): t is string => Boolean(t));

  return (
    <div className="flex flex-col gap-5">
      {resolved ? (
        <StudioPane post={post} resolved={resolved} heading={heading} />
      ) : (
        <p className="text-sm text-bad">This outfit&apos;s code no longer decodes.</p>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <CopyButton code={post.code} className="h-[2.9rem] flex-1 px-6 text-[0.95rem] sm:flex-none" />
        {post.upvotes !== null && <UpvoteButton id={post.id} count={post.upvotes} />}
        <p className="flex items-center gap-1 text-sm text-ink-dim">
          {post.author ?? "Item set"}
          {post.authorVerified && <BadgeCheck className="size-3.5 text-amber" strokeWidth={1.5} aria-label="Verified" />}
        </p>
        {post.authorId && <DeleteLook id={post.id} authorId={post.authorId} />}
      </div>

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
