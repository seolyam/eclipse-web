"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { reportLook } from "@/app/actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { REPORT_REASONS, type ReportReason } from "@/lib/data/types";
import { useAccount } from "@/lib/use-account";

/** Shown to signed-in people other than the author. Moderators decide what happens. */
export function ReportLook({ id, authorId, triggerClassName = "pill" }: { id: string; authorId: string; triggerClassName?: string }) {
  const [account] = useAccount();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [sending, startSending] = useTransition();

  if (!account || account.id === authorId) return null;

  function send() {
    if (!reason) return;
    startSending(async () => {
      const r = await reportLook(id, reason);
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
      <DialogTrigger className={triggerClassName}>Report</DialogTrigger>
      <DialogContent className="gap-5 border-line bg-surface p-6">
        <DialogHeader>
          <DialogTitle>Report this look?</DialogTitle>
          <DialogDescription>
            Moderators see every report and decide whether the look stays up.
          </DialogDescription>
        </DialogHeader>
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">Reason</legend>
          {(Object.entries(REPORT_REASONS) as [ReportReason, string][]).map(([key, label]) => (
            <label key={key} className="flex cursor-pointer items-center gap-2 text-sm text-ink-dim has-checked:text-ink">
              <input type="radio" name="reason" value={key} checked={reason === key} onChange={() => setReason(key)} />
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
