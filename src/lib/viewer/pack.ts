import { R2, itemOfRow, packUrl, paths, type Catalog, type ItemEntry, type ItemShard, type ItemShardRef, type SlotId } from "@eclipse/format";

/**
 * The baked 3D packs: models, items, mounts and their art, built by the Eclipse-Viewer
 * bake and served from its storage. Nothing here is hosted by this site, so drawing a
 * figure costs this site no bandwidth.
 */
export const PACK_BASE: string = (process.env.NEXT_PUBLIC_PACK_BASE || R2.publicBase).replace(/\/$/, "");

/** A pack's image; an empty key means it is not baked. */
export function art(key: string | undefined): string | null {
  return key ? packUrl(PACK_BASE, key) : null;
}

const cache = new Map<string, Promise<unknown>>();

/** One pack file as JSON, fetched once per page. Null when it is missing or the host is down. */
export function packJson<T>(key: string): Promise<T | null> {
  let hit = cache.get(key) as Promise<T | null> | undefined;
  if (!hit) {
    hit = fetch(packUrl(PACK_BASE, key))
      .then((res) => (res.ok ? (res.json() as Promise<T>) : null))
      .catch(() => null);
    // A failure is not kept: the next ask tries again.
    void hit.then((v) => { if (v === null) cache.delete(key); });
    cache.set(key, hit);
  }
  return hit;
}

export const getCatalog = () => packJson<Catalog>(paths.catalog());

// --- Items by in-game entry ---------------------------------------------------
// Items come in shards by line and slot, so a look's slots fetch only their own.

const byEntry = new Map<string, ItemEntry>();
const key = (slot: SlotId, entry: number) => `${slot}:${entry}`;
const slotsLoaded = new Map<SlotId, Promise<void>>();

function loadSlot(slot: SlotId): Promise<void> {
  let done = slotsLoaded.get(slot);
  if (done) return done;
  done = getCatalog().then(async (catalog) => {
    const refs: ItemShardRef[] = (catalog?.itemShards ?? []).filter((r) => r.slot === slot);
    const shards = await Promise.all(refs.map((r) => packJson<ItemShard>(r.key)));
    for (const s of shards) {
      if (!s) continue;
      for (const row of s.rows) {
        const item = itemOfRow(row, s.line, s.slot);
        if (item.entry && !byEntry.has(key(slot, item.entry))) byEntry.set(key(slot, item.entry), item);
      }
    }
    if (!catalog) slotsLoaded.delete(slot);
  });
  slotsLoaded.set(slot, done);
  return done;
}

/** The baked item a game item entry wears in this slot. Undefined: nothing baked draws it. */
export async function itemOfEntry(slot: SlotId, entry: number): Promise<ItemEntry | undefined> {
  const hit = byEntry.get(key(slot, entry));
  if (hit) return hit;
  await loadSlot(slot);
  return byEntry.get(key(slot, entry));
}
