import { BadgeCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { CopyButton } from "@/components/copy-button";
import { ItemRing } from "@/components/item-icon";
import { UpvoteButton } from "@/components/upvote-button";
import { resolveOutfit, type ResolvedOutfit } from "@/lib/catalog";
import { decodeOutfit } from "@/lib/codec/outfit";
import type { OutfitPost } from "@/lib/data/types";
import { ARMOR_LABEL, RACE_LABEL, VISIBLE_SLOTS } from "@/lib/domain";
import { thumbOf } from "@/lib/screenshots";
import { backdropFor, classArt, raceArt } from "@/lib/wow-assets";

const resolve = (post: OutfitPost) => {
  const decoded = decodeOutfit(post.code);
  return decoded.ok ? resolveOutfit(decoded.outfit) : null;
};

const pieces = (resolved: ResolvedOutfit | null) =>
  VISIBLE_SLOTS.flatMap((slot) => resolved?.slots.filter((s) => s.slot === slot) ?? []);

function Crest({ post, resolved }: { post: OutfitPost; resolved: ResolvedOutfit | null }) {
  const art = post.className
    ? classArt(post.className)
    : resolved?.raceKey
      ? raceArt(resolved.raceKey, resolved.sex)
      : null;
  if (!art) return null;
  return <Image src={art} alt="" width={36} height={36} unoptimized className="size-9 rounded-full ring-1 ring-line-strong" />;
}

/** The Wardrobe's view: what the look is made of, and its code. */
export function OutfitCard({ post }: { post: OutfitPost }) {
  const resolved = resolve(post);
  const tags = [
    post.category,
    post.race ? RACE_LABEL[post.race] : null,
    post.armor ? ARMOR_LABEL[post.armor] : null,
  ].filter((t): t is string => Boolean(t));

  return (
    <article className="card-stroke corona-rim relative isolate flex flex-col overflow-hidden rounded-lg border border-line bg-surface transition-colors hover:bg-surface-raised">
      <div aria-hidden className="absolute inset-0 -z-10 bg-cover bg-center opacity-[0.14]" style={{ backgroundImage: `url(${backdropFor(post.id)})` }} />
      <Link href={`/wardrobe/${post.id}`} className="flex flex-1 flex-col gap-3 p-4" aria-label={`Open ${post.title}`}>
        <div className="flex items-center gap-2.5">
          <Crest post={post} resolved={resolved} />
          <div className="min-w-0">
            <h3 className="line-clamp-2 font-serif text-lg leading-tight font-normal tracking-[-0.01em]">{post.title}</h3>
            <p className="flex items-center gap-1 text-xs text-ink-faint">
              {post.author ?? "Item set"}
              {post.authorVerified && <BadgeCheck className="size-3.5 text-amber" strokeWidth={1.5} aria-label="Verified" />}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-1">
          {pieces(resolved).slice(0, 8).map((p) => (
            <ItemRing key={p.slot} icon={p.icon} slot={p.slot} quality={p.quality} size={52} hidden={p.item === 0} />
          ))}
        </div>
        <ul className="mt-auto flex flex-wrap gap-1">
          {tags.map((t) => (
            <li key={t} className="rounded-full bg-surface-high px-2 py-0.5 text-xs text-ink-dim">{t}</li>
          ))}
        </ul>
      </Link>
      <div className="flex items-center justify-between gap-2 border-t border-line p-3">
        {post.upvotes !== null && <UpvoteButton id={post.id} count={post.upvotes} />}
        <CopyButton code={post.code} className="ml-auto" />
      </div>
    </article>
  );
}

/** The Showcase's view: a real capture first, always one click from its code. */
export function OutfitPoster({ post }: { post: OutfitPost }) {
  const resolved = resolve(post);
  const line = [post.race ? RACE_LABEL[post.race] : null, post.className].filter(Boolean).join(" ");
  return (
    <article className="relative">
      <Link href={`/wardrobe/${post.id}`} className="poster" aria-label={`Open ${post.title}`}>
        <Image src={thumbOf(post.gallery[0])} alt="" fill unoptimized sizes="(max-width: 1100px) 72vw, 22vw" className="poster__art" />
        <div className="poster__body">
          <div className="poster__rings">
            {pieces(resolved).slice(0, 5).map((p) => (
              <ItemRing key={p.slot} icon={p.icon} slot={p.slot} quality={p.quality} size={38} hidden={p.item === 0} />
            ))}
          </div>
          <h3 className="font-serif text-lg leading-tight font-normal tracking-[-0.01em]">{post.title}</h3>
          <p className="truncate text-xs text-ink-dim">{line || post.category}</p>
        </div>
      </Link>
      <CopyButton code={post.code} className="absolute top-2.5 right-2.5 z-10" />
    </article>
  );
}
