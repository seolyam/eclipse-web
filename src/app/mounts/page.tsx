import type { Metadata } from "next";
import { HubTabs, HubTitle } from "@/components/hub";
import { MountGrid } from "@/components/viewer/mount-grid";
import { pageMetadata } from "@/lib/seo";
import { getMounts, toCard } from "@/lib/viewer/mounts";

export const metadata: Metadata = pageMetadata("/mounts");

export default async function MountsPage() {
  const mounts = (await getMounts()).map(toCard).sort((a, b) => a.name.localeCompare(b.name));
  return (
    <main id="main" className="wrap flex flex-col gap-5 py-10">
      <HubTitle title="Mounts" blurb="Every mount in the current game, animated, in each of its colours. Open one to see it move, or put a rider on it." />
      <HubTabs current="/mounts" />
      {mounts.length
        ? <MountGrid mounts={mounts} />
        : <p className="text-sm text-ink-dim">The mounts could not load right now. Try again in a moment.</p>}
    </main>
  );
}
