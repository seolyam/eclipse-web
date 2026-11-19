import type { Metadata } from "next";
import Link from "next/link";
import { Decoder, type RemixOf } from "@/components/decoder";
import { pictures, Thumb } from "@/components/game-pictures";
import { HubTitle } from "@/components/hub";
import { SignInOptions } from "@/components/sign-in-dialog";
import { Button } from "@/components/ui/button";
import { getOutfit, repository } from "@/lib/data";
import type { GameSet } from "@/lib/data/types";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("/publish");

type Props = { searchParams?: Promise<{ code?: string | string[]; from?: string | string[] }> };

// Above any loadout the Dressing room writes, and far below what a URL can carry.
const MAX_LINKED_CODE = 8192;

const BLURB = "Share a look with everyone in the Community Gallery, with the screenshots that show it off.";

/** Only a player's look can be credited, published here or shared on Discord. A game set has nobody to credit. */
async function original(id: unknown): Promise<RemixOf | null> {
  if (typeof id !== "string" || !id) return null;
  const post = await getOutfit(id);
  return post && (post.authorId || post.sharedOnDiscord) ? { id: post.id, title: post.title, author: post.author } : null;
}

// A game's pictures wait on their set until it is published, so a set holding any is
// one the player sent from the studio and has not finished: it leads the page.
function ReadyToPublish({ sets }: { sets: GameSet[] }) {
  return (
    <section aria-labelledby="ready-heading" className="flex flex-col gap-3 rounded-lg border border-amber/40 bg-amber/5 p-4">
      <div>
        <h2 id="ready-heading" className="text-sm font-medium text-ink">Ready to publish</h2>
        <p className="text-xs text-ink-dim">
          Pictures your game sent wait here, private to you, until you publish their look to the Community Gallery.
        </p>
      </div>
      <ul className="flex flex-col gap-3">
        {sets.map((set) => (
          <li key={set.id} className="flex flex-wrap items-center gap-3">
            <div className="flex gap-1.5">
              {set.gallery.slice(0, 3).map((path, i) => (
                <Thumb key={path} path={path} alt={`${set.name}, picture ${i + 1}`} className="aspect-video w-24" />
              ))}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-ink">{set.name}</p>
              <p className="text-xs text-ink-faint">{pictures(set.gallery.length)} from your game</p>
            </div>
            <Button asChild size="sm">
              <Link href={`/sets/${set.id}`}>Publish</Link>
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function PublishPage({ searchParams }: Props) {
  const head = <HubTitle title="Publish a look" blurb={BLURB} />;

  if (!repository.live) {
    return (
      <main id="main" className="wrap flex flex-col gap-6 py-10">
        {head}
        <p className="text-sm text-ink-dim">Community publishing is not open yet: the community database is not connected.</p>
      </main>
    );
  }

  // Publishing writes under the visitor's account, so the form waits for a sign-in.
  if (!(await repository.getAccount())) {
    return (
      <main id="main" className="wrap flex flex-col gap-6 py-10">
        {head}
        <div className="flex max-w-sm flex-col gap-3">
          <p className="text-sm text-ink-dim">Sign in to publish a look under your name.</p>
          <SignInOptions />
        </div>
      </main>
    );
  }

  const { code, from } = (await searchParams) ?? {};
  const linked = typeof code === "string" && code.length <= MAX_LINKED_CODE ? code : "";
  const [remixOf, sets] = await Promise.all([linked ? original(from) : null, repository.listGameSets()]);
  const waiting = sets.filter((set) => set.gallery.length > 0);

  return (
    <main id="main" className="wrap flex flex-col gap-8 py-10">
      {head}
      {waiting.length > 0 && <ReadyToPublish sets={waiting} />}
      <section aria-labelledby="code-heading" className="flex flex-col gap-3">
        <div>
          <h2 id="code-heading" className="text-xl font-semibold tracking-[-0.01em] text-ink">From a code</h2>
          <p className="text-sm text-ink-dim">
            Paste an ECA1: loadout code, give the look a title and add your screenshots. Use Share in the game, or copy one from the{" "}
            <Link href="/dressing-room" className="text-amber underline underline-offset-2">Dressing room</Link>.
          </p>
        </div>
        <Decoder initial={linked} canPublish remixOf={remixOf} />
      </section>
    </main>
  );
}
