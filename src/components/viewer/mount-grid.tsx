"use client";

import Image from "next/image";
import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { Input } from "@/components/ui/input";
import type { MountCard } from "@/lib/viewer/mounts";

const KINDS = [
  { value: "all", label: "All" },
  { value: "flying", label: "Flying" },
  { value: "ground", label: "Ground" },
] as const;

/** Every mount, searchable by name, each opening on its own animated stage. */
export function MountGrid({ mounts }: { mounts: MountCard[] }) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<(typeof KINDS)[number]["value"]>("all");
  const q = useDeferredValue(query.trim().toLowerCase());
  const shown = mounts.filter(
    (m) => (kind === "all" || m.flying === (kind === "flying")) && (!q || m.name.toLowerCase().includes(q)),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search mounts"
          placeholder={`Search ${mounts.length.toLocaleString("en-US")} mounts`}
          className="max-w-sm"
        />
        <div className="flex gap-1.5" role="group" aria-label="Kind">
          {KINDS.map((k) => (
            <button key={k.value} type="button" className="pill" aria-pressed={kind === k.value} onClick={() => setKind(k.value)}>
              {k.label}
            </button>
          ))}
        </div>
      </div>
      {!shown.length && <p className="text-sm text-ink-dim">No mount by that name.</p>}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {shown.map((m) => (
          <li key={m.id}>
            <Link href={`/mounts/${m.id}`} className="group flex flex-col overflow-hidden rounded-md border border-line bg-surface transition-colors hover:border-line-strong">
              <span className="relative aspect-square bg-surface-high">
                {m.poster && <Image src={m.poster} alt="" fill unoptimized sizes="12rem" className="object-contain p-2 transition-transform group-hover:scale-105" />}
              </span>
              <span className="flex flex-col gap-0.5 p-2">
                <span className="truncate text-sm">{m.name}</span>
                <span className="text-xs text-ink-faint">
                  {m.flying ? "Flying" : "Ground"}{m.colours > 1 ? ` · ${m.colours} colours` : ""}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
