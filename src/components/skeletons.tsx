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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-72 rounded-lg border border-line bg-surface" />)}
      </div>
    </main>
  );
}
