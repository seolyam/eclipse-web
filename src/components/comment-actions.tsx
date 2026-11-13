"use client";

import { createContext, useContext, useState, useTransition } from "react";
import { toast } from "sonner";
import { removeComment, reportComment } from "@/app/actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { type Account, COMMENT_REPORT_REASONS, type CommentReportReason } from "@/lib/data/types";
import { useAccount } from "@/lib/use-account";

type Viewer = { account: Account | null; checking: boolean };
const ViewerContext = createContext<Viewer>({ account: null, checking: true });

/** One account lookup for the whole comments section, not one for each comment. */
export function CommentsViewer({ children }: { children: React.ReactNode }) {
  const [account, , checking] = useAccount();
  return <ViewerContext value={{ account, checking }}>{children}</ViewerContext>;
}

export const useViewer = () => useContext(ViewerContext);

const QUIET = "text-xs text-ink-faint transition-colors hover:text-ink disabled:opacity-50";

/**
 * Remove, for the comment's writer, the look's author and moderators; Report, for
 * anyone else signed in. The database decides either way.
 */
export function CommentActions({ id, outfitId, writerId, lookAuthorId }: {
  id: string;
  outfitId: string;
  writerId: string;
  lookAuthorId: string;
}) {
  const { account } = useViewer();
  if (!account) return null;
  const canRemove = account.moderator || account.id === writerId || account.id === lookAuthorId;
  return (
    <span className="flex items-center gap-3">
      {account.id !== writerId && <ReportComment id={id} />}
      {canRemove && <RemoveComment id={id} outfitId={outfitId} />}
    </span>
  );
}

/** Asks once, in place: a removed comment is gone for everyone. */
function RemoveComment({ id, outfitId }: { id: string; outfitId: string }) {
  const [asking, setAsking] = useState(false);
  const [removing, startRemoving] = useTransition();

  if (!asking) return <button type="button" className={QUIET} onClick={() => setAsking(true)}>Remove</button>;

  function remove() {
    startRemoving(async () => {
      const r = await removeComment(id, outfitId);
      if (!r.ok) {
        toast.error(r.error);
        setAsking(false);
        return;
      }
      toast.success("Comment removed");
    });
  }

  return (
    <span className="flex items-center gap-2 text-xs">
      <span className="text-ink-dim">Remove for everyone?</span>
      <button type="button" className="text-bad hover:underline disabled:opacity-50" disabled={removing} onClick={remove}>
        {removing ? "Removing" : "Remove"}
      </button>
      <button type="button" className={QUIET} disabled={removing} onClick={() => setAsking(false)}>Keep</button>
    </span>
  );
}

function ReportComment({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<CommentReportReason | null>(null);
  const [sending, startSending] = useTransition();

  function send() {
    if (!reason) return;
    startSending(async () => {
      const r = await reportComment(id, reason);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setOpen(false);
      toast.success("Thanks. A moderator will take a look.");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={QUIET}>Report</DialogTrigger>
      <DialogContent className="gap-5 border-line bg-surface p-6">
        <DialogHeader>
          <DialogTitle>Report this comment?</DialogTitle>
          <DialogDescription>Moderators see every report and decide whether the comment stays.</DialogDescription>
        </DialogHeader>
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">Reason</legend>
          {(Object.entries(COMMENT_REPORT_REASONS) as [CommentReportReason, string][]).map(([key, label]) => (
            <label key={key} className="flex cursor-pointer items-center gap-2 text-sm text-ink-dim has-checked:text-ink">
              <input type="radio" name="comment-reason" value={key} checked={reason === key} onChange={() => setReason(key)} />
              {label}
            </label>
          ))}
        </fieldset>
        <button type="button" className="btn btn--primary btn--block" disabled={!reason || sending} onClick={send}>
          {sending ? "Sending" : "Send report"}
        </button>
      </DialogContent>
    </Dialog>
  );
}
