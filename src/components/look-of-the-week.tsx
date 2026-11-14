import Link from "next/link";
import { OutfitCard, OutfitPoster } from "@/components/outfit-card";
import { Icon } from "@/components/site/icons";
import { repository } from "@/lib/data";

/** The home page's pick, only when a look has earned it this week: a quiet week shows nothing. */
export async function LookOfTheWeek() {
  const pick = await repository.lookOfTheWeek();
  if (!pick) return null;
  const { post, votes } = pick;
  return (
    <section className="section" aria-labelledby="week-heading">
      <div className="wrap">
        <div className="section__row">
          <header className="section__head">
            <h2 id="week-heading">Look of the week</h2>
            <p>
              The most upvoted of the looks posted in the last seven days, with {votes.toLocaleString("en-US")} votes
              {post.author && post.authorId && (
                <>, by <Link href={`/creators/${post.authorId}`} className="underline underline-offset-2">{post.author}</Link></>
              )}
              {post.author && post.sharedOnDiscord && <>, by {post.author}</>}.
            </p>
          </header>
          <Link href={`/wardrobe/${post.id}`} className="btn btn--ghost btn--sm">
            <span>Open the look</span><Icon id="i-arrow" />
          </Link>
        </div>
        <div className="featured">
          {post.gallery.length ? <OutfitPoster post={post} /> : <OutfitCard post={post} />}
        </div>
      </div>
    </section>
  );
}
