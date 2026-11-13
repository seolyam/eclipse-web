"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteLook } from "@/app/actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAccount } from "@/lib/use-account";

/** Shown to the look's author and to moderators. The database decides either way. */
export function DeleteLook({ id, authorId, triggerClassName = "pill" }: { id: string; authorId: string; triggerClassName?: string }) {
  const [account] = useAccount();
  const [open, setOpen] = useState(false);
  const [deleting, startDeleting] = useTransition();
  const router = useRouter();

  if (!account || !(account.moderator || account.id === authorId)) return null;

  function remove() {
    startDeleting(async () => {
      const r = await deleteLook(id);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setOpen(false);
      toast.success("Look deleted");
      router.push("/wardrobe");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={triggerClassName}>Delete</DialogTrigger>
      <DialogContent className="gap-5 border-line bg-surface p-6">
        <DialogHeader>
          <DialogTitle>Delete this look?</DialogTitle>
          <DialogDescription>
            It and its screenshots are removed for everyone. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <button type="button" className="btn btn--primary btn--block" disabled={deleting} onClick={remove}>
          {deleting ? "Deleting" : "Delete look"}
        </button>
      </DialogContent>
    </Dialog>
  );
}
