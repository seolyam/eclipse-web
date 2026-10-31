"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

/**
 * The post's studio captures, one at a time. A post with none shows its Narcissus
 * scene and says so: a code holds no picture, and the site will not invent one.
 */
export function StudioGallery({ images, backdrop, title }: { images: string[]; backdrop: string; title: string }) {
  const [index, setIndex] = useState(0);
  const count = images.length;
  const step = (by: number) => setIndex((i) => (i + by + count) % count);

  if (!count) {
    return (
      <div className="gallery__frame">
        <Image src={backdrop} alt="" fill unoptimized sizes="22rem" className="object-cover" />
        <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-10 text-center text-xs text-ink-dim">
          No studio capture yet
        </p>
      </div>
    );
  }

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
        <Image
          src={images[index]}
          alt={`${title}, screenshot ${index + 1} of ${count}`}
          fill
          unoptimized
          sizes="22rem"
          className="object-cover"
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
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              className="gallery__thumb"
              aria-label={`Show screenshot ${i + 1}`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
            >
              <Image src={src} alt="" fill unoptimized sizes="3rem" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
