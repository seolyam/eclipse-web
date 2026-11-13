import { BadgeCheck, MessageCircle } from "lucide-react";
import Link from "next/link";
import { CommentActions, CommentsViewer } from "@/components/comment-actions";
import { CommentForm } from "@/components/comment-form";
import { CommentScroller } from "@/components/comment-scroller";
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
      className="flex size-8 shrink-0 items-center justify-center rounded-full border border-line bg-surface-raised text-xs font-medium text-ink-dim"
    >
      {name ? [...name][0].toUpperCase() : "?"}
    </span>
  );
}

/** A social app's comment: the name and words in a bubble, when and what to do under it. */
function Comment({ comment, lookAuthorId, now }: { comment: LookComment; lookAuthorId: string; now: number }) {
  const { author, authorId } = comment;
  return (
    <li id={`comment-${comment.id}`} className="flex scroll-mt-4 gap-2.5">
      <Initial name={author} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="w-fit max-w-full rounded-2xl bg-surface-raised px-3 py-2">
          <p className="flex flex-wrap items-center gap-x-1.5 text-[0.8rem]">
            {author ? (
              <Link href={`/creators/${authorId}`} className="font-medium text-ink underline-offset-2 hover:underline">{author}</Link>
            ) : (
              <span className="text-ink-dim">Someone</span>
            )}
            {comment.authorVerified && <BadgeCheck className="size-3.5 text-amber" strokeWidth={1.5} aria-label="Verified" />}
            {authorId === lookAuthorId && (
              <span className="rounded-full border border-amber/40 px-1.5 text-[0.65rem] leading-4 text-amber">Author</span>
            )}
          </p>
          <p className="text-sm leading-snug break-words whitespace-pre-wrap text-ink-dim">{comment.body}</p>
        </div>
        <p className="flex items-center gap-3 px-3">
          <time dateTime={comment.createdAt} title={new Date(comment.createdAt).toUTCString()} className="text-xs text-ink-faint">
            {ago(comment.createdAt, now)}
          </time>
          <CommentActions id={comment.id} outfitId={comment.outfitId} writerId={authorId} lookAuthorId={lookAuthorId} />
        </p>
      </div>
    </li>
  );
}

/**
 * What people said about a look, beside its picture: its own list scrolling oldest
 * first, and the place to write held at the bottom.
 */
export async function LookComments({ outfitId, lookAuthorId }: { outfitId: string; lookAuthorId: string }) {
  const comments = await repository.listComments(outfitId);
  const now = Date.now();

  return (
    <section
      id="comments"
      aria-labelledby="comments-heading"
      className="flex max-h-[36rem] scroll-mt-24 flex-col rounded-lg border border-line bg-surface lg:absolute lg:inset-0 lg:max-h-none"
    >
      <h2 id="comments-heading" className="flex items-baseline gap-2 border-b border-line px-4 py-3 font-sans text-sm font-medium text-ink">
        Comments
        {comments.length > 0 && <span className="nums text-xs font-normal text-ink-faint">{comments.length}</span>}
      </h2>
      <CommentsViewer>
        <CommentScroller count={comments.length}>
          {comments.length > 0 ? (
            <ol className="flex flex-col gap-4 py-4">
              {comments.map((c) => <Comment key={c.id} comment={c} lookAuthorId={lookAuthorId} now={now} />)}
            </ol>
          ) : (
            <div className="flex h-full min-h-40 flex-col items-center justify-center gap-2 py-8 text-center">
              <MessageCircle className="size-6 text-ink-faint" strokeWidth={1.5} aria-hidden />
              <p className="text-sm text-ink-dim">No comments yet</p>
              <p className="text-xs text-ink-faint">Be the first to say what you think.</p>
            </div>
          )}
        </CommentScroller>
        <CommentForm outfitId={outfitId} />
      </CommentsViewer>
    </section>
  );
}
