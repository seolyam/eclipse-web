import { DRESSING_TABS, HubTabs, HubTitle, LOADOUTS_BLURB } from "@/components/hub";

/** A grid of look cards in outline, as the Wardrobe and a creator's page lay them out. */
function LookCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-72 rounded-lg border border-line bg-surface" />)}
    </div>
  );
}

/** The Decoder in outline: the box a code goes in and the panel showing what it holds. */
function DecoderSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="h-10 rounded-md bg-surface" />
      <div className="h-40 rounded-md border border-line bg-surface" />
    </div>
  );
}

/** A look's page in outline, while it loads: its title, picture and pieces. */
export function LookSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-8" role="status" aria-label="Loading the look">
      <div className="flex items-center gap-4">
        <div className="size-[52px] rounded-full bg-surface" />
        <div className="flex flex-col gap-2">
          <div className="h-9 w-72 max-w-full rounded-md bg-surface" />
          <div className="h-4 w-48 rounded-md bg-surface" />
        </div>
      </div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="aspect-[4/3] rounded-md bg-surface" />
        <div className="flex flex-col gap-3">
          <div className="h-[2.9rem] rounded-full bg-surface" />
          {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-12 rounded-md bg-surface" />)}
        </div>
      </div>
    </div>
  );
}

/** The Wardrobe's list in outline, while it loads. */
export function WardrobeSkeleton() {
  return (
    <main id="main" className="wrap flex animate-pulse flex-col gap-5 py-10" role="status" aria-label="Loading the Wardrobe">
      <div className="h-16 w-2/3 rounded-lg bg-surface" />
      <div className="h-10 w-full rounded-lg bg-surface" />
      <LookCardsSkeleton />
    </main>
  );
}

/** A creator's page in outline: their name, their numbers and their looks. */
export function CreatorSkeleton() {
  return (
    <main id="main" className="wrap flex animate-pulse flex-col gap-5 py-10" role="status" aria-label="Loading the creator">
      <div className="flex flex-col gap-2">
        <div className="h-9 w-64 max-w-full rounded-md bg-surface" />
        <div className="h-4 w-56 max-w-full rounded-md bg-surface" />
      </div>
      <LookCardsSkeleton />
    </main>
  );
}

/**
 * Loadouts in outline. The title and tabs hold no data, so they are drawn for real and
 * stay put; only the account's games and loadouts pulse while the page asks for them.
 */
export function LoadoutsSkeleton() {
  return (
    <main id="main" className="wrap flex flex-col gap-8 py-10">
      <HubTitle title="Loadouts" blurb={LOADOUTS_BLURB} />
      <HubTabs current="/loadouts" tabs={DRESSING_TABS} label="Loadouts views" />
      <div className="flex animate-pulse flex-col gap-8" role="status" aria-label="Loading your loadouts">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <div className="h-4 w-16 rounded-md bg-surface" />
            <div className="h-3 w-96 max-w-full rounded-md bg-surface" />
          </div>
          <DecoderSkeleton />
        </div>
        <div className="flex max-w-xl flex-col gap-3">
          <div className="h-3 w-24 rounded-md bg-surface" />
          <div className="h-12 rounded-md bg-surface" />
          <div className="h-9 w-32 rounded-full bg-surface" />
        </div>
        <div className="flex flex-col gap-3">
          <div className="h-3 w-20 rounded-md bg-surface" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => <div key={i} className="h-56 rounded-lg border border-line bg-surface" />)}
          </div>
        </div>
      </div>
    </main>
  );
}

/** A saved loadout's page in outline: the way back, its name and its breakdown. */
export function SetSkeleton() {
  return (
    <main id="main" className="wrap flex animate-pulse flex-col gap-6 py-10" role="status" aria-label="Loading the loadout">
      <div className="h-5 w-24 rounded-md bg-surface" />
      <div className="flex flex-col gap-2">
        <div className="h-10 w-72 max-w-full rounded-md bg-surface" />
        <div className="h-4 w-96 max-w-full rounded-md bg-surface" />
      </div>
      <DecoderSkeleton />
    </main>
  );
}
