"use client";

import Image from "next/image";
import { ModelStage } from "@/components/model-stage";
import { StudioGallery } from "@/components/studio/studio-gallery";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Wearer } from "@/lib/viewer/figure";

/**
 * A look on its character, drawn as soon as the look opens, with any studio captures one
 * switch away. Only a figure that would wear something is drawn: a bare stand-in for a
 * code whose pieces are not baked would show a look that is not there.
 */
export function LookModel({ pieces, wearer, gallery, backdrop, title }: {
  pieces: Record<number, number | null>;
  wearer: Wearer | null;
  gallery: string[];
  backdrop: string;
  title: string;
}) {
  const drawable = wearer !== null || Object.values(pieces).some(Boolean);

  if (!drawable) {
    if (gallery.length) return <StudioGallery images={gallery} backdrop={backdrop} title={title} />;
    return (
      <div className="gallery__frame">
        <Image src={backdrop} alt="" fill unoptimized sizes="22rem" className="object-cover" />
        <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-10 text-center text-xs text-ink-dim">
          These pieces are not in the 3D preview yet. The code still works in game.
        </p>
      </div>
    );
  }

  if (!gallery.length) return <ModelStage pieces={pieces} wearer={wearer} />;

  return (
    <Tabs defaultValue="3d" className="items-center">
      <TabsList aria-label="How to show this look">
        <TabsTrigger value="3d">3D</TabsTrigger>
        <TabsTrigger value="shots">Screenshots</TabsTrigger>
      </TabsList>
      <TabsContent value="3d" className="w-full">
        <ModelStage pieces={pieces} wearer={wearer} />
      </TabsContent>
      <TabsContent value="shots" className="w-full">
        <StudioGallery images={gallery} backdrop={backdrop} title={title} />
      </TabsContent>
    </Tabs>
  );
}
