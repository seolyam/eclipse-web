"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { CopyButton } from "@/components/copy-button";
import { Input } from "@/components/ui/input";
import type { PlaceInfo } from "@/lib/catalog";
import { encodeLook } from "@/lib/codec/world";
import { WORLD_LOOK_NAMES, WORLD_LOOKS, toCss, type WorldLookName } from "@/lib/domain";
import { cn } from "@/lib/utils";

/** Any of the game's quick looks, on any places, as one code. */
export function WorldBuilder() {
  const [look, setLook] = useState<WorldLookName>("Twilight");
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<PlaceInfo[]>([]);
  const [chosen, setChosen] = useState<PlaceInfo[]>([]);

  useEffect(() => {
    if (!query.trim()) {
      setHits([]);
      return;
    }
    const controller = new AbortController();
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`/api/places?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        setHits((await res.json()) as PlaceInfo[]);
      } catch {
        // A superseded search; the next one answers.
      }
    }, 150);
    return () => {
      clearTimeout(handle);
      controller.abort();
    };
  }, [query]);

  const code = chosen.length ? encodeLook(chosen.map((p) => p.tag), WORLD_LOOKS[look]) : null;

  return (
    <section aria-labelledby="builder-heading" className="flex flex-col gap-3 rounded-md border border-line bg-surface p-4">
      <h2 id="builder-heading" className="text-lg">Make your own</h2>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Look">
        {WORLD_LOOK_NAMES.map((name) => (
          <button
            key={name}
            type="button"
            aria-pressed={look === name}
            onClick={() => setLook(name)}
            className={cn(
              "flex items-center gap-1.5 rounded-sm border px-2 py-1 text-sm transition-colors",
              look === name ? "border-amber text-ink" : "border-line text-ink-dim hover:border-line-strong",
            )}
          >
            <span aria-hidden className="flex">
              {Object.values(WORLD_LOOKS[name]).map((c, i) => (
                <span key={i} className="-ml-0.5 size-2.5 rounded-full first:ml-0" style={{ background: toCss(c) }} />
              ))}
            </span>
            {name}
          </button>
        ))}
      </div>
      <div className="relative">
        <Input
          value={query}
          aria-label="Search places"
          placeholder="Search 2,377 places"
          onChange={(e) => setQuery(e.target.value)}
          className="bg-void"
        />
        {hits.length > 0 && (
          <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-md border border-line bg-surface-raised p-1 shadow-lg">
            {hits.map((p) => (
              <li key={p.tag}>
                <button
                  type="button"
                  onClick={() => {
                    setChosen((c) => (c.some((x) => x.tag === p.tag) ? c : [...c, p]));
                    setQuery("");
                  }}
                  className="flex w-full flex-col rounded-sm px-2 py-1 text-left hover:bg-surface-high"
                >
                  <span className="text-sm">{p.name}</span>
                  <span className="text-xs text-ink-faint">{p.path || p.group}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ul className="flex flex-wrap gap-1.5">
          {chosen.map((p) => (
            <li key={p.tag} className="flex items-center gap-1 rounded-sm bg-surface-high py-0.5 pr-1 pl-2 text-sm">
              {p.name}
              <button type="button" aria-label={`Remove ${p.name}`} onClick={() => setChosen((c) => c.filter((x) => x.tag !== p.tag))} className="rounded-sm p-0.5 text-ink-faint hover:text-ink">
                <X className="size-3" />
              </button>
            </li>
          ))}
          {!chosen.length && <li className="text-sm text-ink-faint">Pick a place to get a code.</li>}
        </ul>
        {code && <CopyButton code={code} toastHint="Paste it with Import on Colors > World." />}
      </div>
    </section>
  );
}
