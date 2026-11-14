import type { Metadata } from "next";
import Link from "next/link";
import type { SearchParams } from "nuqs/server";
import { BuiltinNotice, HubTitle, listFromSearch, NoLooks, Pager, PublishButton } from "@/components/hub";
import { OutfitCard, OutfitPoster } from "@/components/outfit-card";
import { OutfitFilters } from "@/components/outfit-filters";
import { itemName } from "@/lib/catalog";
import { repository } from "@/lib/data";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("/community-gallery");

// Everyone's looks, yours among them. Your own are gathered on the Loadouts page.
export default async function CommunityGalleryPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { posts, total, filters } = await listFromSearch(searchParams);

  return (
    <main id="main" className="wrap flex flex-col gap-5 py-10">
      {filters.saved ? (
        <HubTitle title="Bookmarks" blurb="The looks you bookmarked, which only you can see. Copy a code here and use Import on the Loadout page to wear it." />
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <HubTitle title="Community Gallery" blurb="Loadouts the Eclipse community has published from their games. Find one you like, copy its code, and use Import on the Loadout page to wear it." />
            <PublishButton />
          </div>
          <BuiltinNotice />
        </>
      )}
      {filters.author && (
        <p className="text-sm text-ink-dim">
          Showing one person&apos;s looks.{" "}
          <Link href="/community-gallery" className="text-amber underline underline-offset-2">Show everyone&apos;s</Link>
        </p>
      )}
      {filters.item !== null && filters.item > 0 && (
        <p className="text-sm text-ink-dim">
          Showing looks that wear {itemName(filters.item) ?? `item ${filters.item}`}.{" "}
          <Link href="/community-gallery" className="text-amber underline underline-offset-2">Show every look</Link>
        </p>
      )}
      {filters.saved && (
        <p className="text-sm text-ink-dim">
          <Link href="/community-gallery" className="text-amber underline underline-offset-2">Back to the Community Gallery</Link>
        </p>
      )}
      <OutfitFilters count={total} live={repository.live} />
      {!posts.length ? <NoLooks bookmarks={filters.saved} /> : filters.pictures ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {posts.map((post) => <OutfitPoster key={post.id} post={post} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => <OutfitCard key={post.id} post={post} />)}
        </div>
      )}
      <Pager base="/community-gallery" filters={filters} total={total} />
    </main>
  );
}
