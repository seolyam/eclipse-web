"use client";

import Image from "next/image";
import { useState } from "react";
import { ModelStage } from "@/components/model-stage";
import { Button } from "@/components/ui/button";
import type { Wearer } from "@/lib/viewer/figure";

/**
 * A look with no studio capture, drawn on a character only when the visitor asks:
 * the engine and its packs are megabytes, and browsing drawers should not fetch them.
 */
export function LookModel({ pieces, wearer, backdrop }: {
  pieces: Record<number, number | null>;
  wearer: Wearer | null;
  backdrop: string;
}) {
  const [shown, setShown] = useState(false);

  if (shown) return <ModelStage pieces={pieces} wearer={wearer} />;

  return (
    <div className="gallery__frame">
      <Image src={backdrop} alt="" fill unoptimized sizes="22rem" className="object-cover" />
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 bg-gradient-to-t from-black/80 to-transparent p-4 pt-10 text-center">
        <p className="text-xs text-ink-dim">No studio capture yet</p>
        <Button size="sm" onClick={() => setShown(true)}>
          Show 3D preview
        </Button>
      </div>
    </div>
  );
}
