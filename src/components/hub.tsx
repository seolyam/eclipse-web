import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { createSerializer, type SearchParams } from "nuqs/server";
import { repository } from "@/lib/data";
import { LOOKS_PER_PAGE } from "@/lib/domain";
import { wardrobeCache, wardrobeParsers } from "@/lib/search-params";

export function HubTitle({ title, blurb }: { title: string; blurb: string }) {
  return (
    <header className="section__head !mb-0">
      <h1 style={{ font: "400 clamp(1.9rem, 1.3rem + 1.6vw, 2.75rem)/1.12 var(--serif)" }}>{title}</h1>
      <p>{blurb}</p>
    </header>
  );
}

type Tab = { href: string; label: string };

const TABS: Tab[] = [
  { href: "/wardrobe", label: "Wardrobe" },
  { href: "/mounts", label: "Mounts" },
];

/** The Dressing room's views: your loadouts with a code to import, and the builder. */
export const DRESSING_TABS: Tab[] = [
  { href: "/loadouts", label: "Loadouts" },
  { href: "/dressing-room", label: "Dressing room" },
];

/** The filters the Wardrobe reads from the URL. */
export async function listFromSearch(searchParams: Promise<SearchParams>) {
  const f = await wardrobeCache.parse(searchParams);
  const list = await repository.listOutfits({
    q: f.q,
    className: f.class,
    race: f.race,
    armor: f.armor,
    category: f.category,
    tag: f.tag,
    authorId: f.author,
    saved: f.saved,
    item: f.item !== null && f.item > 0 ? f.item : null,
    captured: f.pictures,
    sort: f.sort,
    page: f.page,
  });
  return { ...list, filters: f };
}

export function PublishButton() {
  if (!repository.live) return null;
  return (
    <Link href="/loadouts" className="btn btn--ghost btn--sm">
      <span>Publish a look</span>
    </Link>
  );
}

export function BuiltinNotice() {
  if (repository.live) return null;
  return (
    <p className="rounded-md border border-line bg-surface px-3 py-2 text-xs text-ink-dim">
      These are the game&apos;s own item sets and one look saved in Eclipse, each a code you can wear today. Community publishing is not open yet, so nothing here has an author or votes.
    </p>
  );
}

const EMPTY = "rounded-lg border border-dashed border-line p-10 text-center text-sm text-ink-dim";

export function NoLooks() {
  if (!repository.live) {
    return <p className={EMPTY}>Nothing matches. Only armor sets are listed until community publishing opens, so try clearing a filter.</p>;
  }
  return (
    <p className={EMPTY}>
      Nothing here yet. Clear a filter, or{" "}
      <Link href="/loadouts" className="text-amber underline underline-offset-2">publish the first look</Link>.
    </p>
  );
}

const serialize = createSerializer(wardrobeParsers);

type Filters = Awaited<ReturnType<typeof listFromSearch>>["filters"];

/** Plain links, so every page of looks works without JavaScript and can be crawled. */
export function Pager({ base, filters, total }: { base: string; filters: Filters; total: number }) {
  const pages = Math.ceil(total / LOOKS_PER_PAGE);
  if (pages < 2) return null;
  const page = Math.max(1, filters.page);
  const href = (to: number) => serialize(base, { ...filters, page: to });
  return (
    <nav aria-label="Pages" className="flex items-center justify-center gap-3 pt-2">
      {page > 1 ? (
        <Link href={href(Math.min(page - 1, pages))} className="pill" rel="prev">
          <ChevronLeft className="size-3.5" /> Previous
        </Link>
      ) : null}
      <span className="nums text-xs text-ink-faint">Page {page} of {pages}</span>
      {page < pages ? (
        <Link href={href(page + 1)} className="pill" rel="next">
          Next <ChevronRight className="size-3.5" />
        </Link>
      ) : null}
    </nav>
  );
}

/** A section's views as pills: the Wardrobe's by default, or the Dressing room's. */
export function HubTabs({ current, tabs = TABS, label = "Wardrobe views" }: { current: string; tabs?: Tab[]; label?: string }) {
  return (
    <nav aria-label={label} className="flex flex-wrap gap-1.5">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} className="pill" aria-current={t.href === current ? "page" : undefined}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
