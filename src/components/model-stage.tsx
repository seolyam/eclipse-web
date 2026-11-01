"use client";

import { useEffect, useRef, useState } from "react";
import { SLOT_NAMES } from "@/lib/domain";
import type { Stage } from "@/lib/wow-model/stage";

/** "Your own race" has no body to draw, so a human stands in for it. */
const STAND_IN_RACE = 1;

/** The look on a character. If this fails nothing is lost: the code works without it. */
export function ModelStage({ pieces, race, gender }: {
  /** Slot -> item, for everything worn. */
  pieces: Record<number, number>;
  race: number | null;
  gender: number;
}) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<Promise<Stage> | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [notShown, setNotShown] = useState<number[]>([]);

  // Compared as text, so a new object holding the same pieces does not redraw.
  const look = JSON.stringify({ race: race ?? STAND_IN_RACE, gender, pieces });

  useEffect(() => {
    let wanted = true;
    const next = JSON.parse(look) as { race: number; gender: number; pieces: Record<number, number> };
    // three.js is heavy, and only this page needs it.
    stage.current ??= import("@/lib/wow-model/stage").then(({ createStage }) => createStage(host.current as HTMLElement));
    stage.current
      .then((s) => s.dress(next.race, next.gender, next.pieces, () => wanted))
      .then((missing) => {
        if (!wanted) return;
        setNotShown(missing);
        setStatus("ready");
      })
      .catch(() => {
        if (wanted) setStatus("failed");
      });
    return () => {
      wanted = false;
    };
  }, [look]);

  useEffect(() => () => {
    void stage.current?.then((s) => s.dispose());
    stage.current = null;
  }, []);

  return (
    <div className="flex flex-col gap-1">
      <div ref={host} className="relative aspect-[3/4] w-full cursor-grab touch-none overflow-hidden rounded-md active:cursor-grabbing">
        {status !== "ready" && (
          <p role="status" className="absolute inset-0 grid place-items-center p-4 text-center text-sm text-ink-dim">
            {status === "loading" ? "Dressing the character…" : "The preview could not load. The code still works."}
          </p>
        )}
      </div>
      {notShown.length > 0 && (
        <p className="text-center text-xs text-ink-dim">Not in the preview: {notShown.map((slot) => SLOT_NAMES[slot]).join(", ")}.</p>
      )}
    </div>
  );
}
