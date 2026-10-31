import type { Metadata } from "next";
import type { SearchParams } from "nuqs/server";
import { BuiltinNotice, HubTabs, HubTitle, listFromSearch, NoLooks, Pager, PublishButton } from "@/components/hub";
import { OutfitCard } from "@/components/outfit-card";
import { OutfitFilters } from "@/components/outfit-filters";
import { repository } from "@/lib/data";

export const metadata: Metadata = { title: "Wardrobe" };

export default async function WardrobePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { posts, total, filters } = await listFromSearch(searchParams);

  return (
    <main id="main" className="wrap flex flex-col gap-5 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <HubTitle title="Wardrobe" blurb="Copy a look, then use Import on the Loadout page in the game." />
        <PublishButton />
      </div>
      <HubTabs current="/wardrobe" />
      <BuiltinNotice />
      <OutfitFilters count={total} live={repository.live} />
      {posts.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => <OutfitCard key={post.id} post={post} />)}
        </div>
      ) : <NoLooks />}
      <Pager base="/wardrobe" filters={filters} total={total} />
    </main>
  );
}
