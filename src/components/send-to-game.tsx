"use client";

import { Loader2, Send } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";
import { sendLookToGame } from "@/app/actions";
import { Button } from "@/components/ui/button";

/** Files a look with the visitor's sets, so their next sync brings it into the game. */
export function SendToGame({ id }: { id: string }) {
  const [sending, startSending] = useTransition();

  function send(event: React.MouseEvent) {
    // Cards are links; a send must not open the drawer as well.
    event.preventDefault();
    event.stopPropagation();
    startSending(async () => {
      const r = await sendLookToGame(id);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      if (r.value.linked) {
        toast.success(`Sent as "${r.value.name}"`, {
          description: "It arrives with your next sync. Press Sync now in Eclipse to get it sooner.",
        });
      } else {
        toast.success(`Saved to your sets as "${r.value.name}"`, {
          description: <Link href="/loadouts"className="underline underline-offset-2">Link your game to get it there.</Link>,
        });
      }
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="h-[2.9rem] px-5 text-[0.95rem]"
      disabled={sending}
      onClick={send}
    >
      {sending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Send aria-hidden="true" />}
      Send to game
    </Button>
  );
}
