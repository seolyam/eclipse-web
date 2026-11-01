import type { Metadata } from "next";
import type { SearchParams } from "nuqs/server";
import { HubTabs, HubTitle, listFromSearch, NoCaptures, NoLooks, Pager, PublishButton } from "@/components/hub";
import { OutfitPoster } from "@/components/outfit-card";
import { OutfitFilters } from "@/components/outfit-filters";
import { repository } from "@/lib/data";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("/showcase");

export default async function ShowcasePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { posts, total, filters } = await listFromSearch(searchParams, { captured: true });

  return (
    <main id="main" className="wrap flex flex-col gap-5 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <HubTitle title="Showcase" blurb="Studio shots from players. Every one opens on its exact equipment, and its code is one click away." />
        <PublishButton />
      </div>
      <HubTabs current="/showcase" />
      {repository.live && <OutfitFilters count={total} live />}
      {posts.length ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {posts.map((post) => <OutfitPoster key={post.id} post={post} />)}
        </div>
      ) : repository.live ? <NoLooks /> : <NoCaptures />}
      <Pager base="/showcase" filters={filters} total={total} />
    </main>
  );
}
