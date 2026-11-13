import { BadgeCheck } from "lucide-react";
import Link from "next/link";
import { CommentActions, CommentsViewer } from "@/components/comment-actions";
import { CommentForm } from "@/components/comment-form";
import { ago } from "@/lib/ago";
import { repository } from "@/lib/data";
import type { LookComment } from "@/lib/data/types";

/**
 * A name's first letter in a ring. The sign-in provider's picture is shown to its
 * owner only, so a comment never carries it.
 */
function Initial({ name }: { name: string | null }) {
  return (
    <span
      aria-hidden
      className="flex size-9 shrink-0 items-center justify-center rounded-full border border-line bg-surface-raised text-sm font-medium text-ink-dim"
    >
      {name ? [...name][0].toUpperCase() : "?"}
    </span>
  );
}

function Comment({ comment, lookAuthorId, now }: { comment: LookComment; lookAuthorId: string; now: number }) {
  const { author, authorId } = comment;
  return (
    <li id={`comment-${comment.id}`} className="flex scroll-mt-24 gap-3 py-4 first:pt-0">
      <Initial name={author} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
          {author ? (
            <Link href={`/creators/${authorId}`} className="font-medium text-ink underline-offset-2 hover:underline">{author}</Link>
          ) : (
            <span className="text-ink-dim">Someone</span>
          )}
          {comment.authorVerified && <BadgeCheck className="size-3.5 text-amber" strokeWidth={1.5} aria-label="Verified" />}
          {authorId === lookAuthorId && (
            <span className="rounded-full border border-amber/40 px-1.5 text-[0.68rem] leading-4 text-amber">Author</span>
          )}
          <time dateTime={comment.createdAt} title={new Date(comment.createdAt).toUTCString()} className="text-xs text-ink-faint">
            {ago(comment.createdAt, now)}
          </time>
          <span className="ml-auto">
            <CommentActions id={comment.id} outfitId={comment.outfitId} writerId={authorId} lookAuthorId={lookAuthorId} />
          </span>
        </p>
        <p className="text-sm leading-relaxed break-words whitespace-pre-wrap text-ink-dim">{comment.body}</p>
      </div>
    </li>
  );
}

/** What people said about a look, oldest first, and where to add to it. */
export async function LookComments({ outfitId, lookAuthorId }: { outfitId: string; lookAuthorId: string }) {
  const comments = await repository.listComments(outfitId);
  const now = Date.now();

  return (
    <section id="comments" aria-labelledby="comments-heading" className="flex max-w-3xl scroll-mt-24 flex-col gap-5">
      <h2 id="comments-heading" className="flex items-baseline gap-2 font-sans text-lg font-medium text-ink">
        Comments
        {comments.length > 0 && <span className="nums text-sm font-normal text-ink-faint">{comments.length}</span>}
      </h2>
      <CommentsViewer>
        {comments.length > 0 ? (
          <ol className="flex flex-col divide-y divide-line">
            {comments.map((c) => <Comment key={c.id} comment={c} lookAuthorId={lookAuthorId} now={now} />)}
          </ol>
        ) : (
          <p className="text-sm text-ink-faint">No comments yet. Be the first to say what you think.</p>
        )}
        <CommentForm outfitId={outfitId} />
      </CommentsViewer>
    </section>
  );
}
