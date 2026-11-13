import { X } from "lucide-react";
import Image from "next/image";
import { ItemRing } from "@/components/item-icon";
import type { ResolvedMount, ResolvedOutfit, ResolvedSlot } from "@/lib/catalog";
import { SHEATHE_NAMES } from "@/lib/domain";
import { concept, iconSources, qualityColour, raceArt } from "@/lib/wow-assets";

export function SlotList({
  slots,
  onRemove,
}: {
  slots: ResolvedSlot[];
  /** With this, each row can hand its slot back to the wearer's own gear. */
  onRemove?: (slot: number) => void;
}) {
  if (!slots.length) {
    return <p className="py-2 text-sm text-ink-faint">This code leaves every slot to the wearer&apos;s own gear.</p>;
  }
  return (
    <ul className="divide-y divide-line">
      {slots.map((s) => (
        <li key={s.slot} className="flex items-center gap-3 py-1.5">
          <ItemRing icon={s.icon} slot={s.slot} quality={s.quality} size={44} hidden={s.item === 0} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium" style={{ color: s.item === 0 ? "#1eff00" : qualityColour(s.quality) }}>
              {s.item === 0 ? "Hidden" : (s.name ?? `Item ${s.item}`)}
            </p>
            <p className="text-xs text-ink-faint">{s.label}</p>
          </div>
          <span className="nums font-mono text-xs text-ink-faint">{s.item || ""}</span>
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(s.slot)}
              aria-label={`Remove ${s.label} from the code`}
              className="rounded-sm p-1 text-ink-faint transition-colors hover:bg-surface-high hover:text-ink"
            >
              <X className="size-3.5" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

function Fact({
  art,
  label,
  colour,
  children,
}: {
  art: string;
  label: string;
  colour?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 rounded-md border border-line bg-surface px-2.5 py-2">
      <Image src={art} alt="" width={32} height={32} unoptimized className="rounded-sm" />
      <div className="min-w-0">
        <dt className="text-[0.7rem] text-ink-faint">{label}</dt>
        <dd className="nums flex items-center gap-1.5 truncate text-sm">
          {colour && (
            <span aria-hidden className="size-3 shrink-0 rounded-full border border-black/60" style={{ background: colour }} />
          )}
          <span className="truncate">{children}</span>
        </dd>
      </div>
    </div>
  );
}

const mountName = (m: ResolvedMount) => m.name ?? `Display ${m.id}`;
/** The baked file when there is one, the concept's art when the row names none. */
const mountArt = (m: ResolvedMount) => (m.icon ? iconSources(m.icon, 0)[0] : concept("mount"));

/** Whether a code holds anything besides its pieces: a body, a mount, a glow and the like. */
export const hasLoadoutFacts = (r: ResolvedOutfit) =>
  Boolean(r.race || r.morph || r.mount || r.mountFly || r.mountHidden || r.scale
    || r.glows.length || r.sheathe.length || r.colours.length || r.tints || r.cosmetics);

export function LoadoutFacts({ resolved: r }: { resolved: ResolvedOutfit }) {
  if (!hasLoadoutFacts(r)) return <p className="py-2 text-sm text-ink-faint">Only pieces: no body, mount or glow in this code.</p>;
  return (
    <dl className="grid grid-cols-[repeat(auto-fill,minmax(min(14rem,100%),1fr))] gap-2">
      {r.race && (
        <Fact art={r.raceKey ? raceArt(r.raceKey, r.sex) : concept("unknown")} label="Race morph">
          {r.sex ? `${r.race}, ${r.sex.toLowerCase()}` : r.race}
        </Fact>
      )}
      {r.morph && <Fact art={concept("morph")} label="Creature morph">{r.morphName ?? `Display ${r.morph}`}</Fact>}
      {r.mount && <Fact art={mountArt(r.mount)} label={r.mountFly ? "Ground mount" : "Mount"}>{mountName(r.mount)}</Fact>}
      {r.mountFly && <Fact art={mountArt(r.mountFly)} label="Flying mount">{mountName(r.mountFly)}</Fact>}
      {r.mountHidden && <Fact art={concept("mount")} label="Mount">Hidden</Fact>}
      {r.glows.map((g) => (
        <Fact key={g.hand} art={concept("enchant")} label={`${g.hand} enchant`} colour={g.colour}>
          {g.name ?? `Enchant ${g.id}`}
        </Fact>
      ))}
      {r.sheathe.map((s) => (
        <Fact key={s.hand} art={concept("unknown")} label={`${s.hand} sheathed`}>{SHEATHE_NAMES[s.position]}</Fact>
      ))}
      {r.scale && <Fact art={concept("morph")} label="Scale">{r.scale.toFixed(2)}</Fact>}
      {r.colours.map((c) => (
        <Fact key={c.axis} art={concept("visual")} label={`${c.axis} colour`} colour={c.hex}>{c.hex}</Fact>
      ))}
      {r.tints > 0 && <Fact art={concept("visual")} label="Recoloured pieces">{r.tints}</Fact>}
      {r.cosmetics > 0 && <Fact art={concept("effect")} label="3D effects">{r.cosmetics}</Fact>}
    </dl>
  );
}
