import Image from "next/image";
import { screenshotUrl, thumbOf } from "@/lib/screenshots";

export const pictures = (n: number) => (n === 1 ? "1 picture" : `${n} pictures`);

/** A game picture's small copy, which the site stores beside every picture. */
export function Thumb({ path, alt, className }: { path: string; alt: string; className: string }) {
  return (
    <span className={`relative block overflow-hidden rounded-md border border-line ${className}`}>
      <Image src={thumbOf(screenshotUrl(path))} alt={alt} fill unoptimized sizes="12rem" className="object-cover" />
    </span>
  );
}
