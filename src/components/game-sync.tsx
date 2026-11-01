"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createGameLinkCode, removeGameSet, unlinkGame } from "@/app/actions";
import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/** Issues a code for the game to trade for its token. The code is shown once. */
export function LinkGame() {
  const [code, setCode] = useState<string | null>(null);
  const [creating, startCreating] = useTransition();

  function create() {
    startCreating(async () => {
      const r = await createGameLinkCode();
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setCode(r.value.code);
    });
  }

  if (!code) {
    return (
      <Button type="button" variant="outline" disabled={creating} onClick={create}>
        {creating && <Loader2 className="animate-spin" aria-hidden="true" />}
        Link a game
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-line bg-surface-raised p-4">
      <p className="font-mono text-2xl tracking-[0.15em] text-ink">{code}</p>
      <ol className="list-decimal space-y-1 pl-5 text-sm text-ink-dim">
        <li>In the game, open Eclipse and go to Settings.</li>
        <li>Under Website, paste this code and press Link.</li>
      </ol>
      <p className="text-xs text-ink-faint">It works once and lasts ten minutes. Only enter it in your own game.</p>
      <CopyButton
        code={code}
        variant="outline"
        className="self-start"
        toastHint="Paste it under Website in Eclipse's Settings."
      />
    </div>
  );
}

export function UnlinkGame({ id }: { id: string }) {
  const [unlinking, startUnlinking] = useTransition();
  const router = useRouter();

  function unlink() {
    startUnlinking(async () => {
      const r = await unlinkGame(id);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Game unlinked", { description: "Your sets stay here. It keeps its own copies." });
      router.refresh();
    });
  }

  return (
    <button type="button" className="pill" disabled={unlinking} onClick={unlink}>
      Unlink
    </button>
  );
}

export function RemoveGameSet({ id, name, after }: { id: string; name: string; after?: string }) {
  const [open, setOpen] = useState(false);
  const [removing, startRemoving] = useTransition();
  const router = useRouter();

  function remove() {
    startRemoving(async () => {
      const r = await removeGameSet(id);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setOpen(false);
      toast.success("Set removed");
      if (after) router.push(after);
      else router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${name}`}>
          <Trash2 aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent className="gap-5 border-line bg-surface p-6">
        <DialogHeader>
          <DialogTitle>Remove {name}?</DialogTitle>
          <DialogDescription>It is also deleted from every linked game at its next sync.</DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Keep it</Button>
          <Button type="button" variant="destructive" disabled={removing} onClick={remove}>
            {removing && <Loader2 className="animate-spin" aria-hidden="true" />}
            Remove
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
