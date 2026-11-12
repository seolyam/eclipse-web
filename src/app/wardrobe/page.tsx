import type { Metadata } from "next";
import Link from "next/link";
import type { SearchParams } from "nuqs/server";
import { BuiltinNotice, HubTabs, HubTitle, listFromSearch, NoLooks, Pager, premadeFromSearch, PublishButton } from "@/components/hub";
import { OutfitCard, OutfitPoster } from "@/components/outfit-card";
import { OutfitFilters } from "@/components/outfit-filters";
import { itemName } from "@/lib/catalog";
import { repository } from "@/lib/data";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("/wardrobe");

export default async function WardrobePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { posts, total, filters } = await listFromSearch(searchParams);
  const premade = await premadeFromSearch(filters);

  return (
    <main id="main" className="wrap flex flex-col gap-5 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <HubTitle title="Wardrobe" blurb="Looks Eclipse players have published from their games, with the game's own armor sets below. Find one you like, copy its code, and use Import on the Loadout page in the game to wear it." />
        <PublishButton />
      </div>
      <HubTabs current="/wardrobe" />
      <BuiltinNotice />
      {filters.author && (
        <p className="text-sm text-ink-dim">
          Showing one person&apos;s looks.{" "}
          <Link href="/wardrobe" className="text-amber underline underline-offset-2">Show everyone&apos;s</Link>
        </p>
      )}
      {filters.item !== null && filters.item > 0 && (
        <p className="text-sm text-ink-dim">
          Showing looks that wear {itemName(filters.item) ?? `item ${filters.item}`}.{" "}
          <Link href="/wardrobe" className="text-amber underline underline-offset-2">Show every look</Link>
        </p>
      )}
      {filters.saved && (
        <p className="text-sm text-ink-dim">
          Showing your bookmarks, which only you can see.{" "}
          <Link href="/wardrobe" className="text-amber underline underline-offset-2">Show every look</Link>
        </p>
      )}
      <OutfitFilters count={total} live={repository.live} />
      {repository.live && (
        <header className="mt-2 flex flex-col gap-1">
          <h2 id="community-heading" className="text-lg font-medium text-ink">Community looks</h2>
          <p className="text-sm text-ink-dim">Published by players, with their votes.</p>
        </header>
      )}
      {!posts.length ? <NoLooks /> : filters.pictures ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {posts.map((post) => <OutfitPoster key={post.id} post={post} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => <OutfitCard key={post.id} post={post} />)}
        </div>
      )}
      <Pager base="/wardrobe" filters={filters} total={total} />
      {premade.total > 0 && (
        <section aria-labelledby="premade-heading" className="mt-6 flex flex-col gap-4 border-t border-line pt-8">
          <header id="premade" className="flex scroll-mt-24 flex-col gap-1">
            <h2 id="premade-heading" className="text-lg font-medium text-ink">Pre-made sets</h2>
            <p className="text-sm text-ink-dim">
              The game&apos;s own armor sets, ready to wear. Nobody published these, so they have no author or votes.
            </p>
          </header>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {premade.posts.map((post) => <OutfitCard key={post.id} post={post} />)}
          </div>
          <Pager base="/wardrobe" filters={filters} total={premade.total} param="setsPage" hash="#premade" />
        </section>
      )}
    </main>
  );
}
