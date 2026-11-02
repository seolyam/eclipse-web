"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CopyButton } from "@/components/copy-button";
import { ItemRing } from "@/components/item-icon";
import { ModelStage } from "@/components/model-stage";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ItemHit } from "@/lib/catalog";
import { RACE_BY_ID, RACE_LABEL, SLOT_NAMES, VISIBLE_SLOTS } from "@/lib/domain";
import { dressedCode } from "@/lib/dressing-room";
import { NARCISSUS_URL } from "@/lib/site";
import { cn } from "@/lib/utils";
import { backdropFor, qualityColour } from "@/lib/wow-assets";

const LEFT = VISIBLE_SLOTS.slice(0, 7);
const RIGHT = VISIBLE_SLOTS.slice(7);
const OWN_RACE = "own";
const SEXES = ["Male", "Female"];

/** What each slot holds: an item, or null to hide it. No key leaves it to the wearer. */
type Rack = Record<number, ItemHit | null>;

function Piece({ slot, rack, side, active, onChoose }: {
  slot: number;
  rack: Rack;
  side: "left" | "right";
  active: boolean;
  onChoose: (slot: number) => void;
}) {
  const piece = rack[slot];
  const hidden = piece === null;
  const name = piece === undefined ? "Your own gear" : hidden ? "Hidden" : piece.name;
  return (
    <li>
      <button
        type="button"
        aria-label={`Choose ${SLOT_NAMES[slot]}`}
        aria-pressed={active}
        onClick={() => onChoose(slot)}
        className={cn("piece w-full", side === "left" ? "text-left" : "piece--right", active && "bg-surface-high")}
      >
        <ItemRing icon={piece?.icon ?? null} slot={slot} quality={piece?.quality ?? null} size={52} hidden={hidden} empty={piece === undefined} />
        <span className="block min-w-0 flex-1">
          <span
            className="piece__name"
            style={{ color: hidden ? "#1eff00" : piece ? qualityColour(piece.quality) : "var(--ink-faint)" }}
          >
            {name}
          </span>
          <span className="piece__slot block">{SLOT_NAMES[slot]}</span>
        </span>
      </button>
    </li>
  );
}

/** Pick pieces slot by slot, see them on a character, and take away a code. */
export function DressingRoom({ itemCount }: { itemCount: number }) {
  const [rack, setRack] = useState<Rack>({});
  const [active, setActive] = useState<number>(VISIBLE_SLOTS[0]);
  const [query, setQuery] = useState("");
  // Results carry their slot: until the next answer lands, the last slot's items
  // must not be offered for this one, or a click would dress the wrong slot.
  const [found, setFound] = useState<{ slot: number; hits: ItemHit[] } | null>(null);
  const [failed, setFailed] = useState(false);
  const [race, setRace] = useState(OWN_RACE);
  const [gender, setGender] = useState(0);
  const search = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`/api/items?slot=${active}&q=${encodeURIComponent(query)}`, { signal: controller.signal });
        if (!res.ok) throw new Error(String(res.status));
        setFound({ slot: active, hits: (await res.json()) as ItemHit[] });
        setFailed(false);
      } catch {
        // An abort is a superseded search, and the next one answers.
        if (!controller.signal.aborted) setFailed(true);
      }
    }, 150);
    return () => {
      clearTimeout(handle);
      controller.abort();
    };
  }, [active, query]);

  const choose = (slot: number) => {
    setActive(slot);
    setQuery("");
    // The search sits below the slots, off screen from the upper ones on a phone.
    search.current?.scrollIntoView({ block: "nearest" });
  };
  const wear = (piece: ItemHit | null) => setRack((r) => ({ ...r, [active]: piece }));
  const clear = () => setRack((r) => {
    const next = { ...r };
    delete next[active];
    return next;
  });

  const hits = found?.slot === active ? found.hits : null;
  const chosenRace = race === OWN_RACE ? null : Number(race);
  const code = dressedCode(
    Object.fromEntries(Object.entries(rack).map(([slot, piece]) => [slot, piece?.id ?? 0])),
    chosenRace === null ? null : { race: chosenRace, gender },
  );
  const worn = Object.fromEntries(Object.entries(rack).flatMap(([slot, piece]) => (piece ? [[slot, piece.id]] : [])));

  return (
    <section className="studio" aria-label="Dressing room">
      <div className="studio__scene" style={{ backgroundImage: `url(${backdropFor("dressing-room")})` }} aria-hidden />
      <div className="studio__grid pt-5">
        <ul className="flex flex-col gap-1.5">
          {LEFT.map((slot) => <Piece key={slot} slot={slot} rack={rack} side="left" active={slot === active} onChoose={choose} />)}
        </ul>
        <div className="studio__stage">
          <ModelStage pieces={worn} race={chosenRace} gender={gender} />
        </div>
        <ul className="flex flex-col gap-1.5">
          {RIGHT.map((slot) => <Piece key={slot} slot={slot} rack={rack} side="right" active={slot === active} onChoose={choose} />)}
        </ul>
      </div>
      <div ref={search} className="mx-5 mb-4 flex scroll-mt-20 flex-col gap-2 rounded-md border border-line bg-surface/85 p-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg">{SLOT_NAMES[active]}</h2>
          <div className="flex gap-3 text-xs text-ink-dim">
            <button type="button" onClick={() => wear(null)} className="underline underline-offset-2 hover:text-ink">Hide slot</button>
            <button type="button" onClick={clear} disabled={!(active in rack)} className="underline underline-offset-2 enabled:hover:text-ink disabled:no-underline disabled:opacity-50">Clear</button>
          </div>
        </div>
        <Input
          value={query}
          aria-label={`Search ${SLOT_NAMES[active]} items`}
          placeholder={`Search ${itemCount.toLocaleString("en-US")} items`}
          onChange={(e) => setQuery(e.target.value)}
        />
        {failed && <p role="alert" className="text-sm text-ink-dim">Could not load items. Try again in a moment.</p>}
        {hits && !hits.length && <p className="text-sm text-ink-dim">Nothing by that name fits this slot.</p>}
        {hits && (
          <ul className="grid max-h-72 grid-cols-1 gap-0.5 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
            {hits.map((item) => (
              <li key={item.id} className="min-w-0">
                <button
                  type="button"
                  onClick={() => wear(item)}
                  aria-pressed={rack[active]?.id === item.id}
                  className="flex w-full items-center gap-2 rounded-sm p-1 text-left text-sm transition-colors hover:bg-surface-high"
                >
                  <ItemRing icon={item.icon} slot={active} quality={item.quality} size={36} />
                  <span className="min-w-0 truncate" style={{ color: qualityColour(item.quality) }}>{item.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-line px-5 py-3">
        <Select value={race} onValueChange={setRace}>
          <SelectTrigger size="sm" aria-label="Race" className="min-w-44 rounded-full bg-surface">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={OWN_RACE}>Your own race</SelectItem>
            {Object.entries(RACE_BY_ID).map(([id, key]) => <SelectItem key={id} value={id}>{RACE_LABEL[key]}</SelectItem>)}
          </SelectContent>
        </Select>
        {race !== OWN_RACE && (
          <div className="flex gap-1.5" role="group" aria-label="Sex">
            {SEXES.map((label, value) => (
              <button key={label} type="button" aria-pressed={gender === value} onClick={() => setGender(value)} className="pill">{label}</button>
            ))}
          </div>
        )}
        <div className="ml-auto flex flex-wrap items-center justify-end gap-3">
          {code
            ? <CopyButton code={code} />
            : <p className="text-sm text-ink-dim">Choose a piece to get a code.</p>}
        </div>
      </div>
      <p className="flex flex-wrap justify-between gap-x-4 gap-y-1 px-5 pb-4 text-[0.7rem] text-ink-faint">
        <span>
          The preview is a still figure with a default face and hair, and &quot;Your own race&quot; shows a human. A game without HD models shows simpler bodies. Import the code in the game to see it on your character. To publish a look, paste its code into the{" "}
          <Link href="/inspector" className="underline underline-offset-2 hover:text-ink-dim">Inspector</Link>.
        </span>
        <span>
          Scene and rings:{" "}
          <a href={NARCISSUS_URL} target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-ink-dim">Narcissus</a>{" "}
          by Peterodox, CC BY-NC-SA 4.0
        </span>
      </p>
    </section>
  );
}
