import type { Metadata } from "next";
import type { SearchParams } from "nuqs/server";
import { CopyButton } from "@/components/copy-button";
import { HubTabs, HubTitle } from "@/components/hub";
import { WorldBuilder } from "@/components/world-builder";
import { WorldFilters } from "@/components/world-filters";
import { resolvePlace } from "@/lib/catalog";
import { WORLD_ROWS } from "@/lib/codec/world";
import { repository } from "@/lib/data";
import { WORLD_LOOKS, toCss } from "@/lib/domain";
import { worldCache } from "@/lib/search-params";

export const metadata: Metadata = { title: "World presets" };

export default async function WorldPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const f = await worldCache.parse(searchParams);
  const presets = await repository.listWorldPresets({ group: f.group, look: f.look });

  return (
    <main id="main" className="wrap flex flex-col gap-5 py-10">
      <HubTitle
        title="World presets"
        blurb="Each place has four rows: Ground, Buildings, Objects and Grass. Copy a code, then use Import on Colors > World."
      />
      <HubTabs current="/world" />
      <WorldBuilder />
      <WorldFilters />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {presets.map((p) => {
          const colours = WORLD_LOOKS[p.look];
          return (
            <article key={p.id} className="corona-rim flex flex-col overflow-hidden rounded-md border border-line bg-surface">
              <div className="grid h-20 grid-cols-4" aria-label={`${p.look} colours`}>
                {WORLD_ROWS.map((row) => (
                  <div key={row} title={row} style={{ background: toCss(colours[row]) }} />
                ))}
              </div>
              <div className="flex flex-1 flex-col gap-1 p-3">
                <h2 className="text-[15px] leading-5 tracking-tight">{p.title}</h2>
                {p.blurb && <p className="text-sm text-ink-dim">{p.blurb}</p>}
                <p className="mt-auto pt-1 text-xs text-ink-faint">
                  {p.places.map((t) => resolvePlace(t)?.name ?? t).join(", ")}
                </p>
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-line p-3">
                <CopyButton code={p.code} toastHint="Paste it with Import on Colors > World." />
              </div>
            </article>
          );
        })}
      </div>
      {!presets.length && (
        <p className="rounded-md border border-dashed border-line p-10 text-center text-sm text-ink-dim">
          No looks match. Clear a filter above.
        </p>
      )}
    </main>
  );
}
