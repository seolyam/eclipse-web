"use client";

import type { SlotId } from "@eclipse/format";
import type { ViewerEngine } from "@eclipse/engine";
import { useEffect, useRef, useState } from "react";
import { SLOT_NAMES } from "@/lib/domain";
import { bodyOf, lookTextOf, slotIdOf, wornOf, type Wearer } from "@/lib/viewer/figure";
import { PACK_BASE, itemOfEntry } from "@/lib/viewer/pack";
import { $engine } from "@/lib/viewer/state";

const ALL_SLOTS: SlotId[] = ["head", "shoulder", "back", "chest", "shirt", "tabard", "wrist", "hands", "waist", "legs", "feet", "mainhand", "offhand", "ranged"];
const MORPH_OF = Object.fromEntries(
  Array.from({ length: 19 }, (_, slot) => [slotIdOf(slot), slot]).filter(([id]) => id),
) as Record<SlotId, number>;

/** The look on an animated character. If this fails nothing is lost: the code works without it. */
export function ModelStage({ pieces, wearer, children }: {
  /** Morph slot -> item entry, for everything worn. 0 hides the slot. */
  pieces: Record<number, number>;
  /** Null: "your own race", which a human stands in for. */
  wearer: Wearer | null;
  /** Controls drawn over the figure's foot, such as the animation picker. */
  children?: React.ReactNode;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const engine = useRef<Promise<ViewerEngine> | null>(null);
  const body = useRef<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [notShown, setNotShown] = useState<number[]>([]);

  // Compared as text, so a new object holding the same look does not redraw.
  const look = JSON.stringify({ wearer, pieces });

  useEffect(() => {
    let wanted = true;
    const next = JSON.parse(look) as { wearer: Wearer | null; pieces: Record<number, number> };
    // three.js and the engine are heavy, and only a figure needs them.
    engine.current ??= import("@eclipse/engine").then(async ({ createEngine }) => {
      const e = createEngine({
        packBase: PACK_BASE,
        interactable: true,
        animated: !matchMedia("(prefers-reduced-motion: reduce)").matches,
        cameraStyle: innerWidth < 768 ? "mobile" : "default",
        shadow: true,
        shortcuts: false,
        lockCamera: false,
      });
      await e.mount(canvas.current as HTMLCanvasElement);
      $engine.set(e);
      return e;
    });

    (async () => {
      const e = await engine.current!;
      const id = bodyOf(next.wearer);
      if (id !== body.current) {
        setStatus("loading");
        await e.loadModel(id, lookTextOf(next.wearer?.line));
        body.current = id;
      }
      const worn = wornOf(next.pieces);
      const found = await Promise.all(worn.map(async ([slot, entry]) => [slot, await itemOfEntry(slot, entry)] as const));
      if (!wanted) return;
      const items = new Map(found.flatMap(([slot, item]) => (item ? [[slot, item.id] as const] : [])));
      await Promise.all(ALL_SLOTS.map((slot) => e.equip(slot, items.get(slot) ?? null)));
      if (!wanted) return;
      setNotShown(found.filter(([, item]) => !item).map(([slot]) => MORPH_OF[slot]));
      setStatus("ready");
    })().catch((err: unknown) => {
      // A newer look superseded this one: it answers instead.
      if (err instanceof DOMException && err.name === "AbortError") return;
      if (wanted) setStatus("failed");
    });
    return () => {
      wanted = false;
    };
  }, [look]);

  useEffect(() => () => {
    void engine.current?.then((e) => {
      if ($engine.get() === e) $engine.set(null);
      e.dispose();
    });
    engine.current = null;
    body.current = null;
  }, []);

  return (
    <div className="flex flex-col gap-1">
      <div className="relative aspect-[3/4] w-full cursor-grab touch-none overflow-hidden rounded-md active:cursor-grabbing">
        <canvas ref={canvas} className="absolute inset-0 size-full" />
        {status !== "ready" && (
          <p role="status" className="absolute inset-0 grid place-items-center p-4 text-center text-sm text-ink-dim">
            {status === "loading" ? "Dressing the character…" : "The preview could not load. The code still works."}
          </p>
        )}
        {children && status === "ready" && <div className="absolute inset-x-2 bottom-2 flex items-center gap-2">{children}</div>}
      </div>
      {notShown.length > 0 && (
        <p className="text-center text-xs text-ink-dim">Not in the preview: {notShown.map((slot) => SLOT_NAMES[slot]).join(", ")}.</p>
      )}
    </div>
  );
}
