"use client";

import { useQueryStates } from "nuqs";
import { useTransition } from "react";
import { WORLD_GROUPS, WORLD_LOOK_NAMES } from "@/lib/domain";
import { worldParsers } from "@/lib/search-params";
import { cn } from "@/lib/utils";

function Chips<T extends string>({ label, value, options, onChange }: {
  label: string;
  value: T | null;
  options: readonly T[];
  onChange: (v: T | null) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={value === o}
          onClick={() => onChange(value === o ? null : o)}
          className={cn(
            "rounded-sm border px-2 py-0.5 text-sm transition-colors",
            value === o ? "border-amber text-ink" : "border-line text-ink-dim hover:border-line-strong",
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

export function WorldFilters() {
  const [, startTransition] = useTransition();
  const [f, set] = useQueryStates(worldParsers, { shallow: false, startTransition });
  return (
    <div className="flex flex-col gap-2">
      <Chips label="Place group" value={f.group} options={WORLD_GROUPS.filter((g) => g !== "Other")} onChange={(group) => set({ group })} />
      <Chips label="Look" value={f.look} options={WORLD_LOOK_NAMES} onChange={(look) => set({ look })} />
    </div>
  );
}
