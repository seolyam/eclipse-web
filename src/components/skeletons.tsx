/** A look's page in outline, while it loads. */
export function LookSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-5" role="status" aria-label="Loading the look">
      <div className="h-[28rem] rounded-lg border border-line bg-surface" />
      <div className="flex gap-3">
        <div className="h-[2.9rem] w-40 rounded-full bg-surface" />
        <div className="h-[2.9rem] w-28 rounded-full bg-surface" />
      </div>
      <div className="h-24 rounded-lg bg-surface" />
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
