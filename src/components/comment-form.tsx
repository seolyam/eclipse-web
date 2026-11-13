"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { postComment } from "@/app/actions";
import { SignInOptions } from "@/components/sign-in-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { COMMENT_MAX } from "@/lib/comments";
import { useViewer } from "@/components/comment-actions";

const BOX = "rounded-lg border border-line bg-surface";

/**
 * Where a signed-in person adds to a look's comments. The new comment comes back
 * with the page, which the action revalidates, so nothing is drawn twice.
 */
export function CommentForm({ outfitId }: { outfitId: string }) {
  const { account, checking } = useViewer();
  const [text, setText] = useState("");
  const [posting, startPosting] = useTransition();
  const field = useRef<HTMLTextAreaElement>(null);

  // Holds the form's place until we know who is here, so nothing jumps.
  if (checking) return <div className={`${BOX} h-[7.5rem]`} aria-hidden />;

  if (!account) {
    return (
      <div className={`${BOX} flex flex-wrap items-center justify-between gap-3 p-4`}>
        <p className="text-sm text-ink-dim">Sign in to say what you think of this look.</p>
        <Dialog>
          <DialogTrigger className="btn btn--ghost btn--sm">Sign in</DialogTrigger>
          <DialogContent className="gap-5 border-line bg-surface p-6">
            <DialogHeader>
              <DialogTitle>Sign in to comment</DialogTitle>
              <DialogDescription>Comment, publish your looks and vote.</DialogDescription>
            </DialogHeader>
            <SignInOptions />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const left = COMMENT_MAX - text.length;

  function send() {
    if (!text.trim() || left < 0) return;
    startPosting(async () => {
      const r = await postComment(outfitId, text);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setText("");
      field.current?.blur();
    });
  }

  return (
    <form
      className={`${BOX} flex flex-col focus-within:border-line-strong`}
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
    >
      <label htmlFor="comment-body" className="sr-only">Write a comment</label>
      <textarea
        ref={field}
        id="comment-body"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            send();
          }
        }}
        rows={3}
        maxLength={COMMENT_MAX + 100}
        placeholder={account.name ? `Comment as ${account.name}` : "Write a comment"}
        className="field-sizing-content max-h-60 min-h-20 w-full resize-none bg-transparent px-4 pt-3 text-sm text-ink outline-none placeholder:text-ink-faint"
      />
      <div className="flex items-center justify-end gap-3 px-3 pb-3">
        {left < 80 && (
          <span className={`nums text-xs ${left < 0 ? "text-bad" : "text-ink-faint"}`} aria-live="polite">{left}</span>
        )}
        <button type="submit" className="btn btn--primary btn--sm" disabled={posting || !text.trim() || left < 0}>
          {posting ? "Posting" : "Post"}
        </button>
      </div>
    </form>
  );
}
