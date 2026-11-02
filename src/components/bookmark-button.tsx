"use client";

import { Bookmark } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { bookmarkLook } from "@/app/actions";
import { cn } from "@/lib/utils";

/** A private save. Nobody else sees who bookmarked what, so there is no count. */
export function BookmarkButton({ id, saved: initial, className }: { id: string; saved: boolean; className?: string }) {
  const [saved, setSaved] = useState(initial);
  const [shown, show] = useOptimistic(saved, (_: boolean, next: boolean) => next);
  const [, start] = useTransition();
  const label = shown ? "Remove bookmark" : "Bookmark";

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={shown}
      title={label}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const next = !saved;
        start(async () => {
          show(next);
          const r = await bookmarkLook(id, next);
          if (!r.ok) {
            toast.error(r.error);
            return;
          }
          setSaved(next);
          if (next) toast.success("Bookmarked. Find it under Bookmarks in your account menu.");
        });
      }}
      className={cn(
        "flex h-8 items-center rounded-sm border border-line px-2 text-ink-dim transition-colors hover:border-line-strong hover:text-ink",
        shown && "text-amber",
        className,
      )}
    >
      <Bookmark className="size-4" strokeWidth={1.5} fill={shown ? "currentColor" : "none"} />
    </button>
  );
}
