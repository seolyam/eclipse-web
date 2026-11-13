import { BadgeCheck, ChevronDown, Code, Shirt } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { BookmarkButton } from "@/components/bookmark-button";
import { CopyButton } from "@/components/copy-button";
import { DeleteLook } from "@/components/delete-look";
import { LookPieces } from "@/components/look-pieces";
import { ModeratorReports } from "@/components/moderator-reports";
import { hasLoadoutFacts, LoadoutFacts } from "@/components/outfit-breakdown";
import { ReportLook } from "@/components/report-look";
import { SendToGame } from "@/components/send-to-game";
import { LookModel } from "@/components/studio/look-model";
import { UpvoteButton } from "@/components/upvote-button";
import { resolveOutfit, type ResolvedOutfit } from "@/lib/catalog";
import { decodeOutfit } from "@/lib/codec/outfit";
import { repository } from "@/lib/data";
import type { OutfitPost } from "@/lib/data/types";
import { ARMOR_LABEL, RACE_LABEL, VISIBLE_SLOTS } from "@/lib/domain";
import { NARCISSUS_URL } from "@/lib/site";
import { wearerOf } from "@/lib/viewer/figure";
import { backdropFor, classArt, raceArt } from "@/lib/wow-assets";

const VISIBLE = VISIBLE_SLOTS as readonly number[];

/** The Dressing room dresses visible slots only, so a pure morph or mount has nothing to open. */
const hasArmor = (r: ResolvedOutfit) => r.slots.some((s) => VISIBLE.includes(s.slot));

/** Slot -> baked model for each visible piece the code wears, for the 3D preview. */
const worn = (r: ResolvedOutfit) =>
  Object.fromEntries(r.slots.filter((s) => s.item !== 0 && VISIBLE.includes(s.slot)).map((s) => [s.slot, s.display]));

/** The look's class crest, or its race's portrait, in the studio's artifact ring. */
function Crest({ post, resolved }: { post: OutfitPost; resolved: ResolvedOutfit | null }) {
  const art = post.className
    ? classArt(post.className)
    : resolved?.raceKey
      ? raceArt(resolved.raceKey, resolved.sex)
      : null;
  if (!art) return <Image src="/assets/img/logo-320.webp" alt="" width={48} height={48} unoptimized className="shrink-0" />;
  return (
    <span className="hex shrink-0" style={{ width: 52, height: 52 }}>
      <span className="hex__icon"><Image src={art} alt="" width={52} height={52} unoptimized /></span>
      <Image src="/wow/rings/artifact.png" alt="" width={52} height={52} unoptimized className="hex__frame" />
    </span>
  );
}

/**
 * A look's page: who it is, the game's picture of it, what to do with it, and what it
 * wears. Everything else sits quietly underneath.
 */
export async function OutfitDetail({ post }: { post: OutfitPost }) {
  // Only a published look has an author, and only those can be bookmarked or reported.
  const saved = post.authorId ? await repository.isBookmarked(post.id) : false;
  const decoded = decodeOutfit(post.code);
  const resolved = decoded.ok ? resolveOutfit(decoded.outfit) : null;
  const facts = [post.className, post.race ? RACE_LABEL[post.race] : null, post.armor ? ARMOR_LABEL[post.armor] : null]
    .filter((t): t is string => Boolean(t));
  const tags = [...post.categories, ...post.tags];

  return (
    <article className="flex flex-col gap-8">
      {post.authorId && <ModeratorReports id={post.id} />}

      <header className="flex items-center gap-4">
        <Crest post={post} resolved={resolved} />
        <div className="min-w-0">
          <h1 className="text-3xl leading-tight text-balance sm:text-4xl">{post.title}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-ink-dim">
            {facts.length > 0 && <span>{facts.join(" · ")}</span>}
            {facts.length > 0 && <span aria-hidden className="text-ink-faint">·</span>}
            <span className="inline-flex items-center gap-1">
              {post.authorId && post.author ? (
                <>by <Link href={`/creators/${post.authorId}`} className="text-ink underline-offset-2 hover:underline">{post.author}</Link></>
              ) : (post.author ?? "The game's own set")}
              {post.authorVerified && <BadgeCheck className="size-3.5 text-amber" strokeWidth={1.5} aria-label="Verified" />}
            </span>
          </p>
          {post.remixedFrom && (
            <p className="mt-0.5 text-sm text-ink-faint">
              Based on{" "}
              <Link href={`/wardrobe/${post.remixedFrom.id}`} className="text-amber underline-offset-2 hover:underline">{post.remixedFrom.title}</Link>
              {post.remixedFrom.author && <> by {post.remixedFrom.author}</>}
            </p>
          )}
        </div>
      </header>

      {!resolved && <p className="text-sm text-bad">This look&apos;s code no longer decodes.</p>}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <LookModel
          pieces={resolved ? worn(resolved) : {}}
          wearer={decoded.ok ? wearerOf(decoded.outfit.look) : null}
          gallery={post.gallery}
          backdrop={backdropFor(post.id)}
          title={post.title}
        />

        <aside className="flex flex-col gap-6" aria-label="Use this look">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <CopyButton code={post.code} className="h-[2.9rem] flex-1 px-6 text-[0.95rem]" />
              {repository.live && <SendToGame id={post.id} />}
            </div>
            {(post.upvotes !== null || (repository.live && post.authorId)) && (
              <div className="flex items-center gap-2">
                {post.upvotes !== null && <UpvoteButton id={post.id} count={post.upvotes} />}
                {repository.live && post.authorId && <BookmarkButton id={post.id} saved={saved} />}
              </div>
            )}
          </div>

          {resolved && <LookPieces resolved={resolved} />}

          {resolved && hasLoadoutFacts(resolved) && (
            <section aria-labelledby="facts-heading" className="flex flex-col gap-2">
              <h2 id="facts-heading" className="font-sans text-sm font-medium text-ink">Also in this code</h2>
              <LoadoutFacts resolved={resolved} />
            </section>
          )}
        </aside>
      </div>

      <footer className="flex flex-col gap-6 border-t border-line pt-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          {tags.length > 0 && (
            <section aria-labelledby="tags-heading" className="flex min-w-0 flex-col gap-2">
              <h2 id="tags-heading" className="font-sans text-sm font-medium text-ink">Tags</h2>
              <ul className="flex flex-wrap gap-2">
                {tags.map((t) => (
                  <li key={t} className="rounded-full border border-line bg-surface-raised px-3 py-1 text-sm text-ink-dim">{t}</li>
                ))}
              </ul>
            </section>
          )}
          {((resolved && hasArmor(resolved)) || post.authorId) && (
            <div className="flex flex-wrap items-center gap-2 sm:ml-auto sm:justify-end sm:self-end">
              {resolved && hasArmor(resolved) && (
                <Link href={`/dressing-room?look=${encodeURIComponent(post.id)}`} className="pill">
                  <Shirt className="size-4" strokeWidth={1.5} aria-hidden />Open in Dressing room
                </Link>
              )}
              {post.authorId && <ReportLook id={post.id} authorId={post.authorId} />}
              {post.authorId && (
                <DeleteLook id={post.id} authorId={post.authorId} triggerClassName="pill hover:border-bad/50 hover:text-bad" />
              )}
            </div>
          )}
        </div>

        <details className="group rounded-lg border border-line bg-surface">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium text-ink-dim transition-colors hover:text-ink [&::-webkit-details-marker]:hidden">
            <Code className="size-4" strokeWidth={1.5} aria-hidden />
            Look code
            <ChevronDown className="ml-auto size-4 transition-transform group-open:rotate-180" strokeWidth={1.5} aria-hidden />
          </summary>
          <div className="flex flex-col gap-3 border-t border-line p-4">
            <pre className="max-h-40 overflow-auto rounded-md border border-line bg-void p-3 font-mono text-xs leading-[18px] break-all whitespace-pre-wrap text-ink-dim">
              {post.code}
            </pre>
            <CopyButton code={post.code} variant="outline" className="self-start" />
          </div>
        </details>

        <p className="text-xs text-ink-faint">
          Scene and rings:{" "}
          <a href={NARCISSUS_URL} target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-ink-dim">Narcissus</a>
          {" "}by Peterodox, CC BY-NC-SA 4.0
        </p>
      </footer>
    </article>
  );
}
