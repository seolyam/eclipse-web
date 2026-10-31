"use client";

import { ArrowBigUp } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { upvoteOutfit } from "@/app/actions";

export function UpvoteButton({ id, count }: { id: string; count: number }) {
  const [shown, bump] = useOptimistic(count, (c: number) => c + 1);
  const [, start] = useTransition();

  return (
    <button
      type="button"
      aria-label={`Upvote, ${count} votes`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        start(async () => {
          bump(undefined);
          const r = await upvoteOutfit(id);
          if (!r.ok) toast.error(r.error);
        });
      }}
      className="nums flex h-8 items-center gap-1 rounded-sm border border-line px-2 text-sm text-ink-dim transition-colors hover:border-line-strong hover:text-ink"
    >
      <ArrowBigUp className="size-4" strokeWidth={1.5} />
      {shown.toLocaleString("en-US")}
    </button>
  );
}
