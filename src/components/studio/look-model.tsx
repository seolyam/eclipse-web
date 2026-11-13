"use client";

import { Box, Images } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useState } from "react";
import { StudioGallery } from "@/components/studio/studio-gallery";
import type { Wearer } from "@/lib/viewer/figure";

// The figure's code and the models it streams load only once a visitor asks for them.
const ModelStage = dynamic(() => import("@/components/model-stage").then((m) => m.ModelStage), {
  ssr: false,
  loading: () => <div className="gallery__frame animate-pulse" aria-label="Loading the 3D preview" />,
});

/**
 * A look as the game drew it: its studio screenshots first. The 3D figure is one click away,
 * because it is slow to load and spends the viewer's pack host, and it only offers itself when
 * it would wear something: a bare stand-in for a code whose pieces are not baked would show a
 * look that is not there.
 */
export function LookModel({ pieces, wearer, gallery, backdrop, title }: {
  pieces: Record<number, number | null>;
  wearer: Wearer | null;
  gallery: string[];
  backdrop: string;
  title: string;
}) {
  const [figure, setFigure] = useState(false);
  const drawable = wearer !== null || Object.values(pieces).some(Boolean);
  const incomplete = Object.values(pieces).some((display) => display === null);

  if (figure && drawable) {
    return (
      <div className="flex w-full flex-col gap-3">
        <ModelStage pieces={pieces} wearer={wearer} />
        {gallery.length > 0 && (
          <button type="button" className="pill self-center" onClick={() => setFigure(false)}>
            <Images className="size-3.5" aria-hidden />
            Show screenshots
          </button>
        )}
      </div>
    );
  }

  const offer = drawable && (
    <div className="flex flex-col items-center gap-1.5 self-center">
      <button type="button" className="pill" onClick={() => setFigure(true)}>
        <Box className="size-3.5" aria-hidden />
        Show 3D preview
      </button>
      {incomplete && <p className="text-center text-[0.7rem] text-ink-faint">Some pieces are not in the 3D preview yet.</p>}
    </div>
  );

  if (gallery.length) {
    return (
      <div className="flex w-full flex-col gap-3">
        <StudioGallery images={gallery} backdrop={backdrop} title={title} />
        {offer}
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="gallery__frame">
        <Image src={backdrop} alt="" fill unoptimized sizes="22rem" className="object-cover" />
        <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-10 text-center text-xs text-ink-dim">
          {drawable
            ? "No screenshot from the game yet. The code works in game."
            : "No screenshot from the game yet, and these pieces are not in the 3D preview. The code still works in game."}
        </p>
      </div>
      {offer}
    </div>
  );
}
