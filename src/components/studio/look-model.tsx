"use client";

import Image from "next/image";
import { useState } from "react";
import { ModelStage } from "@/components/model-stage";
import { Button } from "@/components/ui/button";

/**
 * A look with no studio capture, drawn on a character only when the visitor asks:
 * the model reads game files through /game-cdn, and browsing drawers should not.
 */
export function LookModel({ pieces, race, gender, backdrop }: {
  pieces: Record<number, number>;
  race: number | null;
  gender: number;
  backdrop: string;
}) {
  const [shown, setShown] = useState(false);

  if (shown) return <ModelStage pieces={pieces} race={race} gender={gender} />;

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
