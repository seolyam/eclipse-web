import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LookOfTheWeek } from "@/components/look-of-the-week";
import { OutfitCard, OutfitPoster } from "@/components/outfit-card";
import { Icon } from "@/components/site/icons";
import { Download, Features, Hero, Support } from "@/components/site/landing";
import { repository } from "@/lib/data";
import { siteStructuredData } from "@/lib/seo";
import { OPEN_GRAPH } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { ...OPEN_GRAPH, url: "/" },
};

/** Real captures once players have posted them, and real looks until then. */
async function FeaturedLooks() {
  const { posts: captures } = await repository.listOutfits({ sort: "top", captured: true, pageSize: 4 });
  const looks = captures.length ? [] : (await repository.listOutfits({ sort: "top", pageSize: 4, itemSets: true })).posts;
  if (!captures.length && !looks.length) return null;
  const community = captures.length > 0 || looks.some((post) => post.authorId);
  return (
    <section className="section" id="wardrobe" aria-labelledby="featured-heading">
      <div className="wrap">
        <div className="section__row">
          <header className="section__head">
            <h2 id="featured-heading">From the Wardrobe</h2>
            <p>
              {community
                ? "Looks the community has dressed, every one a code away from your character."
                : "Real item sets from the game, every one a code away from your character."}
            </p>
          </header>
          <Link href={captures.length ? "/wardrobe?pictures=true" : "/wardrobe"} className="btn btn--ghost btn--sm">
            <span>Open the Wardrobe</span><Icon id="i-arrow" />
          </Link>
        </div>
        <div className="featured">
          {captures.map((post) => <OutfitPoster key={post.id} post={post} />)}
          {looks.map((post) => <OutfitCard key={post.id} post={post} />)}
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <main id="main" className="landing">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: siteStructuredData() }} />
      <Hero />
      {/* The database must not hold back the hero: it sits below the first screen. */}
      <Suspense fallback={null}>
        <LookOfTheWeek />
      </Suspense>
      <Suspense fallback={null}>
        <FeaturedLooks />
      </Suspense>
      <Features live={repository.live} />
      <Download />
      <Support />
    </main>
  );
}
