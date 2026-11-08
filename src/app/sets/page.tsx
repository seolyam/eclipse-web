import type { Metadata } from "next";
import Link from "next/link";
import { after } from "next/server";
import { CopyButton } from "@/components/copy-button";
import { LinkGame, RemoveGameSet, UnlinkGame } from "@/components/game-sync";
import { HubTitle } from "@/components/hub";
import { ItemRing } from "@/components/item-icon";
import { SignInOptions } from "@/components/sign-in-dialog";
import { resolveOutfit } from "@/lib/catalog";
import { decodeOutfit } from "@/lib/codec/outfit";
import { repository } from "@/lib/data";
import type { GameLink, GameSet } from "@/lib/data/types";
import { VISIBLE_SLOTS } from "@/lib/domain";

export const metadata: Metadata = {
  title: "Your sets",
  description: "The looks saved in your game, private to you.",
  robots: { index: false, follow: false },
};

const BLURB = "The looks saved in your game, backed up here and private to you. Publishing one is always your choice.";

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
];

function ago(iso: string, now: number) {
  const format = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const elapsed = new Date(iso).getTime() - now;
  for (const [unit, size] of UNITS) {
    if (Math.abs(elapsed) >= size) return format.format(Math.round(elapsed / size), unit);
  }
  return "just now";
}

function Linked({ link, now }: { link: GameLink; now: number }) {
  return (
    <li className="flex items-center justify-between gap-3 border-t border-line py-2.5 first:border-t-0">
      <div className="min-w-0">
        <p className="truncate text-sm text-ink">{link.label || "Waiting for its first sync"}</p>
        <p className="text-xs text-ink-faint">
          {link.lastSyncAt ? `Synced ${ago(link.lastSyncAt, now)}` : `Linked ${ago(link.linkedAt, now)}`}
        </p>
      </div>
      <UnlinkGame id={link.id} />
    </li>
  );
}

function SetCard({ set, now }: { set: GameSet; now: number }) {
  const decoded = decodeOutfit(set.code);
  const slots = decoded.ok ? resolveOutfit(decoded.outfit).slots : [];
  const pieces = VISIBLE_SLOTS.flatMap((slot) => slots.filter((s) => s.slot === slot));

  return (
    <article className="card-stroke flex flex-col overflow-hidden rounded-lg border border-line bg-surface transition-colors hover:bg-surface-raised">
      <Link href={`/sets/${set.id}`} className="flex flex-1 flex-col gap-3 p-4" aria-label={`Open ${set.name}`}>
        <div className="min-w-0">
          <h3 className="line-clamp-2 font-serif text-lg leading-tight font-normal tracking-[-0.01em]">{set.name}</h3>
          <p className="text-xs text-ink-faint">Updated {ago(set.updatedAt, now)}</p>
          {set.gallery.length > 0 && (
            <p className="text-xs text-ink-dim">
              {set.gallery.length === 1 ? "1 picture" : `${set.gallery.length} pictures`} from your game
            </p>
          )}
        </div>
        {pieces.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1">
            {pieces.slice(0, 8).map((p) => (
              <ItemRing key={p.slot} icon={p.icon} slot={p.slot} quality={p.quality} size={52} hidden={p.item === 0} />
            ))}
          </div>
        )}
      </Link>
      <div className="flex items-center justify-between gap-2 border-t border-line p-3">
        <RemoveGameSet id={set.id} name={set.name} />
        <CopyButton code={set.code} className="ml-auto" />
      </div>
    </article>
  );
}

export default async function SetsPage() {
  const account = await repository.getAccount();
  if (!account) {
    return (
      <main id="main" className="wrap flex flex-col gap-6 py-10">
        <HubTitle title="Your sets" blurb={BLURB} />
        {repository.live ? (
          <div className="max-w-sm">
            <SignInOptions />
          </div>
        ) : (
          <p className="text-sm text-ink-dim">Sets are not open yet: the community database is not connected.</p>
        )}
      </main>
    );
  }

  // Pictures of a look that changed or went: removed once this page has answered.
  after(() => repository.clearOrphanPictures());
  const [links, sets] = await Promise.all([repository.listGameLinks(), repository.listGameSets()]);
  const now = Date.now();

  return (
    <main id="main" className="wrap flex flex-col gap-8 py-10">
      <HubTitle title="Your sets" blurb={BLURB} />

      <section aria-labelledby="games-heading" className="flex max-w-xl flex-col gap-3">
        <h2 id="games-heading" className="text-xs font-medium text-ink-faint">Linked games</h2>
        {links.length > 0 ? (
          <ul>{links.map((link) => <Linked key={link.id} link={link} now={now} />)}</ul>
        ) : (
          <p className="text-sm text-ink-dim">
            Link your game to back up your loadouts, restore them on another PC and send looks from this site straight into the game.
          </p>
        )}
        <div className="self-start">
          <LinkGame />
        </div>
      </section>

      <section aria-labelledby="sets-heading" className="flex flex-col gap-3">
        <h2 id="sets-heading" className="text-xs font-medium text-ink-faint">
          {sets.length === 1 ? "1 set" : `${sets.length} sets`}
        </h2>
        {sets.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sets.map((set) => <SetCard key={set.id} set={set} now={now} />)}
          </div>
        ) : (
          <p className="text-sm text-ink-dim">
            Nothing here yet. Loadouts you save in a linked game appear here, and so do looks you send from the{" "}
            <Link href="/wardrobe" className="text-amber underline underline-offset-2">Wardrobe</Link>.
          </p>
        )}
      </section>
    </main>
  );
}
