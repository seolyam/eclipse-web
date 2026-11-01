// Where the dressing room gets the game's files. Nothing is hosted here: the tables in
// /dress say which bytes of which CDN archive hold a file, or for a large file its own
// name, and the browser asks through /game-cdn, a rewrite, because the CDN does not
// answer browsers.
import { decodeBlte } from "./blte";
import type { BodyFiles } from "./figure";
import type { ItemRecipe } from "./recipe";

const ITEM_SHARDS = 128;
const FILE_SHARDS = 256;

type Place = [archive: number, offset: number, size: number] | [loose: string];

const dataUrl = (name: string) => `/game-cdn/data/${name.slice(0, 2)}/${name.slice(2, 4)}/${name}`;

export function gameFiles(fetcher: typeof fetch = (...args) => fetch(...args)) {
  const tables = new Map<string, Promise<unknown>>();
  const reads = new Map<number, Promise<ArrayBuffer>>();

  const table = <T>(url: string): Promise<T> => {
    let pending = tables.get(url);
    if (!pending) {
      pending = fetcher(url).then((res) => {
        if (!res.ok) throw new Error(`Could not read ${url}: ${res.status}.`);
        return res.json();
      });
      // A failed read must not stay cached, or the room would need a reload to recover.
      pending.catch(() => tables.delete(url));
      tables.set(url, pending);
    }
    return pending as Promise<T>;
  };

  async function download(file: number): Promise<ArrayBuffer> {
    const [{ archives }, places] = await Promise.all([
      table<{ archives: string[] }>("/dress/manifest.json"),
      table<Record<string, Place>>(`/dress/files/${file % FILE_SHARDS}.json`),
    ]);
    const place = places[file];
    if (!place) throw new Error(`File ${file} is not in the table.`);
    const res = place.length === 1
      ? await fetcher(dataUrl(place[0]))
      : await fetcher(dataUrl(archives[place[0]]), {
          headers: { Range: `bytes=${place[1]}-${place[1] + place[2] - 1}` },
        });
    if (res.status !== (place.length === 1 ? 200 : 206)) {
      await res.body?.cancel();
      throw new Error(`Expected a range for file ${file}, got ${res.status}.`);
    }
    const decoded = await decodeBlte(new Uint8Array(await res.arrayBuffer()));
    // A plain block is a view into the download; a caller needs only the file.
    return decoded.slice().buffer;
  }

  return {
    read(file: number): Promise<ArrayBuffer> {
      let pending = reads.get(file);
      if (!pending) {
        pending = download(file);
        pending.catch(() => reads.delete(file));
        reads.set(file, pending);
      }
      return pending;
    },
    async recipe(item: number): Promise<ItemRecipe | null> {
      const shard = await table<Record<string, ItemRecipe>>(`/dress/items/${item % ITEM_SHARDS}.json`);
      return shard[item] ?? null;
    },
    async body(race: number, gender: number): Promise<BodyFiles | null> {
      const bodies = await table<Record<string, BodyFiles>>("/dress/bodies.json");
      return bodies[`${race}-${gender}`] ?? null;
    },
  };
}
