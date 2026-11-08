import Image from "next/image";
import Link from "next/link";
import { ItemRing } from "@/components/item-icon";
import { LookModel } from "@/components/studio/look-model";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ResolvedOutfit, ResolvedSlot } from "@/lib/catalog";
import type { OutfitPost } from "@/lib/data/types";
import { decodeOutfit } from "@/lib/codec/outfit";
import { SLOT_NAMES, VISIBLE_SLOTS } from "@/lib/domain";
import { NARCISSUS_URL } from "@/lib/site";
import { wearerOf } from "@/lib/viewer/figure";
import { backdropFor, classArt, qualityColour, QUALITY_NAME, raceArt } from "@/lib/wow-assets";

// The studio's "Narcissus" template (ShowcaseOverlay.cpp): seven pieces either
// side of the figure, in the order a person reads a character.
const LEFT = VISIBLE_SLOTS.slice(0, 7);
const RIGHT = VISIBLE_SLOTS.slice(7);

/** Slot -> baked model for each visible piece the code wears; hidden and empty slots draw nothing. */
const worn = (resolved: ResolvedOutfit) =>
  Object.fromEntries(
    resolved.slots
      .filter((s) => s.item !== 0 && (VISIBLE_SLOTS as readonly number[]).includes(s.slot))
      .map((s) => [s.slot, s.display]),
  );

/** Who the code dresses, face and hair included. Null: a stand-in, for a code with no look. */
const wearer = (code: string) => {
  const decoded = decodeOutfit(code);
  return decoded.ok ? wearerOf(decoded.outfit.look) : null;
};

function Piece({ slot, piece, side }: { slot: number; piece: ResolvedSlot | undefined; side: "left" | "right" }) {
  const hidden = piece?.item === 0;
  const name = !piece ? "Your own gear" : hidden ? "Hidden" : (piece.name ?? `Item ${piece.item}`);
  const known = piece?.quality ?? null;
  // A piece with no baked model is missing from the 3D figure, though it works in game.
  const noModel = !!piece && !hidden && piece.display === null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <li className={side === "right" ? "piece piece--right" : "piece"} tabIndex={0}>
          <ItemRing
            icon={piece?.icon ?? null}
            slot={slot}
            quality={known}
            size={52}
            hidden={hidden}
            empty={!piece}
          />
          <div className="min-w-0 flex-1">
            <p
              className="piece__name"
              style={{ color: hidden ? "#1eff00" : piece ? qualityColour(known) : "var(--ink-faint)" }}
            >
              {piece && !hidden ? (
                <Link href={`/wardrobe?item=${piece.item}`} className="underline-offset-2 hover:underline" aria-label={`Looks that wear ${name}`}>
                  {name}
                </Link>
              ) : name}
            </p>
            <p className="piece__slot">{SLOT_NAMES[slot]}{noModel && " · not in 3D"}</p>
          </div>
        </li>
      </TooltipTrigger>
      <TooltipContent side={side === "left" ? "right" : "left"}>
        {!piece && "This code leaves the slot to the wearer."}
        {hidden && "The code hides this slot on purpose."}
        {piece && !hidden && `Item ${piece.item}${known === null ? "" : `, ${QUALITY_NAME[known]}`}. Open it for every look that wears it.`}
        {noModel && " The 3D preview cannot draw it yet; it still shows in game."}
      </TooltipContent>
    </Tooltip>
  );
}

function Column({ slots, resolved, side }: { slots: readonly number[]; resolved: ResolvedOutfit; side: "left" | "right" }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {slots.map((slot) => (
        <Piece key={slot} slot={slot} side={side} piece={resolved.slots.find((s) => s.slot === slot)} />
      ))}
    </ul>
  );
}

function Crest({ post, resolved }: { post: OutfitPost; resolved: ResolvedOutfit }) {
  const art = post.className
    ? classArt(post.className)
    : resolved.raceKey
      ? raceArt(resolved.raceKey, resolved.sex)
      : null;
  if (!art) return <Image src="/assets/img/logo-320.webp" alt="" width={56} height={56} unoptimized />;
  return (
    <span className="hex" style={{ width: 64, height: 64 }}>
      <span className="hex__icon"><Image src={art} alt="" width={64} height={64} unoptimized /></span>
      <Image src="/wow/rings/artifact.png" alt="" width={64} height={64} unoptimized className="hex__frame" />
    </span>
  );
}

export function StudioPane({
  post,
  resolved,
  heading: Heading = "h1",
}: {
  post: OutfitPost;
  resolved: ResolvedOutfit;
  heading?: "h1" | "h2";
}) {
  const scene = backdropFor(post.id);
  const line = [resolved.race, post.className].filter(Boolean).join(" ");
  return (
    <section className="studio" aria-label={`${post.title}, equipment`}>
      <div className="studio__scene" style={{ backgroundImage: `url(${scene})` }} aria-hidden />
      <header className="flex items-center gap-3 p-5 pb-4">
        <Crest post={post} resolved={resolved} />
        <div className="min-w-0">
          <p className="text-xs text-amber">{[line, post.category].filter(Boolean).join("  |  ")}</p>
          <Heading className="text-2xl leading-tight sm:text-3xl">{post.title}</Heading>
        </div>
      </header>
      <div className="studio__grid">
        <Column slots={LEFT} resolved={resolved} side="left" />
        <div className="studio__stage">
          {/* The pieces themselves, drawn as the Dressing room draws them; captures sit behind a switch. */}
          <LookModel
            pieces={worn(resolved)}
            wearer={wearer(post.code)}
            gallery={post.gallery}
            backdrop={scene}
            title={post.title}
          />
        </div>
        <Column slots={RIGHT} resolved={resolved} side="right" />
      </div>
      <p className="px-5 pb-4 text-right text-[0.7rem] text-ink-faint">
        Scene and rings:{" "}
        <a href={NARCISSUS_URL} target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-ink-dim">
          Narcissus
        </a>{" "}
        by Peterodox, CC BY-NC-SA 4.0
      </p>
    </section>
  );
}
