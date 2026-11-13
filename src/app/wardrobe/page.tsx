import type { Metadata } from "next";
import Link from "next/link";
import type { SearchParams } from "nuqs/server";
import { BuiltinNotice, HubTabs, HubTitle, listFromSearch, listsOthers, NoLooks, Pager, PublishButton } from "@/components/hub";
import { OutfitCard, OutfitPoster } from "@/components/outfit-card";
import { OutfitFilters } from "@/components/outfit-filters";
import { itemName } from "@/lib/catalog";
import { repository } from "@/lib/data";
import type { OutfitList } from "@/lib/data/types";
import { wardrobeCache } from "@/lib/search-params";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("/wardrobe");

// One row of your newest looks; the rest are on your creator page.
const OWN_LOOKS = 3;
// The design system's `title` style.
const SECTION_HEADING = { font: "600 24px/30px var(--sans)", letterSpacing: "-0.02em" };

function YourLooks({ accountId, posts, total }: { accountId: string } & OutfitList) {
  return (
    <section aria-labelledby="own-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="own-heading" style={SECTION_HEADING}>Your Published Loadouts</h2>
        {total > OWN_LOOKS && (
          <Link href={`/creators/${accountId}`} className="text-sm text-amber underline underline-offset-2">
            See all {total}
          </Link>
        )}
      </div>
      {posts.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => <OutfitCard key={post.id} post={post} />)}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-ink-dim">
          You haven&apos;t published a look yet.{" "}
          <Link href="/loadouts" className="text-amber underline underline-offset-2">Publish one from your loadouts</Link>.
        </p>
      )}
    </section>
  );
}

export default async function WardrobePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const [account, query] = await Promise.all([repository.getAccount(), wardrobeCache.parse(searchParams)]);
  const viewerId = account?.id ?? null;
  // Your looks lead the first page; both lists are read at once.
  const showOwn = viewerId !== null && listsOthers(query, viewerId) && query.page <= 1;
  const [{ posts, total, filters, community }, own] = await Promise.all([
    listFromSearch(searchParams, viewerId),
    showOwn ? repository.listOutfits({ sort: "newest", authorId: viewerId, pageSize: OWN_LOOKS }) : null,
  ]);

  return (
    <main id="main" className="wrap flex flex-col gap-5 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <HubTitle title="Wardrobe" blurb="Loadouts the Eclipse community has published from their games. Find one you like, copy its code, and use Import on the Loadout page to wear it." />
        <PublishButton />
      </div>
      <HubTabs current="/wardrobe" />
      <BuiltinNotice />
      {own && viewerId && <YourLooks accountId={viewerId} {...own} />}
      {community && <h2 id="community-heading" className="pt-3" style={SECTION_HEADING}>Community Loadouts</h2>}
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
      {!posts.length ? <NoLooks others={community} /> : filters.pictures ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {posts.map((post) => <OutfitPoster key={post.id} post={post} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => <OutfitCard key={post.id} post={post} />)}
        </div>
      )}
      <Pager base="/wardrobe" filters={filters} total={total} />
    </main>
  );
}
