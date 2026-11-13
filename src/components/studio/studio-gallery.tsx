"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { thumbOf } from "@/lib/screenshots";

const SIZES = "(min-width: 1024px) 40rem, 100vw";

/**
 * The look's studio captures, one at a time and never cropped: captures come in any shape
 * (the game's studio is near square, a desktop screenshot is wide), so each is shown whole
 * over a blurred copy of itself.
 */
export function StudioGallery({ images, title }: { images: string[]; title: string }) {
  const [index, setIndex] = useState(0);
  const count = images.length;
  const step = (by: number) => setIndex((i) => (i + by + count) % count);
  const src = images[index];

  return (
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label={`Screenshots of ${title}`}
      tabIndex={count > 1 ? 0 : undefined}
      onKeyDown={(e) => {
        if (count < 2) return;
        if (e.key === "ArrowRight") step(1);
        if (e.key === "ArrowLeft") step(-1);
      }}
    >
      <div className="gallery__frame">
        <Image src={src} alt="" aria-hidden fill unoptimized sizes={SIZES} className="gallery__fill" />
        <Image
          src={src}
          alt={count > 1 ? `${title}, screenshot ${index + 1} of ${count}` : `${title}, screenshot`}
          fill
          unoptimized
          priority
          sizes={SIZES}
          className="object-contain"
        />
        {count > 1 && (
          <>
            <button type="button" aria-label="Previous screenshot" onClick={() => step(-1)} className="gallery__nav left-2">
              <ChevronLeft className="size-4" />
            </button>
            <button type="button" aria-label="Next screenshot" onClick={() => step(1)} className="gallery__nav right-2">
              <ChevronRight className="size-4" />
            </button>
          </>
        )}
      </div>
      {count > 1 && (
        <div className="gallery__thumbs">
          {images.map((image, i) => (
            <button
              key={image}
              type="button"
              className="gallery__thumb"
              aria-label={`Show screenshot ${i + 1}`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
            >
              <Image src={thumbOf(image)} alt="" fill unoptimized sizes="4rem" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
