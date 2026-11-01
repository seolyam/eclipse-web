import { describe, expect, it, vi } from "vitest";
import { gameFiles } from "./files";

const ARCHIVE = "ab12cd34".padEnd(32, "0");
const LOOSE = "cd34ef56".padEnd(32, "1");
const blte = (...bytes: number[]) => Uint8Array.from([0x42, 0x4c, 0x54, 0x45, 0, 0, 0, 0, 0x4e, ...bytes]);

function server(over: Record<string, () => Response> = {}) {
  const calls: { url: string; range: string | null }[] = [];
  const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, range: new Headers(init?.headers).get("range") });
    const special = over[url];
    if (special) return special();
    if (url === "/dress/manifest.json") return Response.json({ build: "1", archives: ["x".repeat(32), ARCHIVE] });
    if (url === "/dress/files/8.json") return Response.json({ 264: [1, 100, 12], 520: [LOOSE] });
    if (url === "/dress/items/1.json") return Response.json({ 129: { texture: 5 } });
    if (url === "/dress/bodies.json") return Response.json({ "4-1": { model: 7, skin: 8, hairstyle: 2 } });
    if (url.includes(LOOSE)) return new Response(blte(4, 5), { status: 200 });
    if (url.startsWith("/game-cdn/")) return new Response(blte(1, 2, 3), { status: 206 });
    return new Response("missing", { status: 404 });
  });
  return { calls, files: gameFiles(fetcher as unknown as typeof fetch) };
}

describe("reading a game file", () => {
  it("asks for exactly its bytes inside its archive", async () => {
    const { calls, files } = server();
    const data = await files.read(264);
    expect(new Uint8Array(data)).toEqual(Uint8Array.of(1, 2, 3));
    expect(calls.at(-1)).toEqual({ url: `/game-cdn/data/ab/12/${ARCHIVE}`, range: "bytes=100-111" });
  });

  // A body is 17 MB. Files that size are not packed into archives at all.
  it("reads a large file whole from its own address, with no range", async () => {
    const { calls, files } = server();
    expect(new Uint8Array(await files.read(520))).toEqual(Uint8Array.of(4, 5));
    expect(calls.at(-1)).toEqual({ url: `/game-cdn/data/cd/34/${LOOSE}`, range: null });
  });

  it("hands back only the file, not the buffer it was cut from", async () => {
    const { files } = server();
    expect((await files.read(264)).byteLength).toBe(3);
  });

  // An archive is 256 MB. A server that ignores the range must not get to send it.
  it("refuses a whole archive sent in place of its range", async () => {
    const url = `/game-cdn/data/ab/12/${ARCHIVE}`;
    const { files } = server({ [url]: () => new Response(blte(1), { status: 200 }) });
    await expect(files.read(264)).rejects.toThrow(/range/i);
  });

  it("fetches a file once however many ask for it", async () => {
    const { calls, files } = server();
    await Promise.all([files.read(264), files.read(264)]);
    await files.read(264);
    expect(calls.filter((c) => c.url.startsWith("/game-cdn/"))).toHaveLength(1);
  });

  it("can try again after a failure", async () => {
    let fail = true;
    const url = `/game-cdn/data/ab/12/${ARCHIVE}`;
    const { files } = server({
      [url]: () => {
        if (fail) return new Response("busy", { status: 503 });
        return new Response(blte(9), { status: 206 });
      },
    });
    await expect(files.read(264)).rejects.toThrow();
    fail = false;
    expect(new Uint8Array(await files.read(264))).toEqual(Uint8Array.of(9));
  });

  it("says so when a file is not in the table", async () => {
    const { files } = server();
    await expect(files.read(8)).rejects.toThrow(/8/);
  });
});

describe("reading what to dress", () => {
  it("finds an item's recipe in its shard, and null when it has none", async () => {
    const { files } = server();
    expect(await files.recipe(129)).toEqual({ texture: 5 });
    expect(await files.recipe(1)).toBeNull();
  });

  it("finds a body by race and sex", async () => {
    const { files } = server();
    expect(await files.body(4, 1)).toMatchObject({ model: 7 });
    expect(await files.body(99, 0)).toBeNull();
  });
});
