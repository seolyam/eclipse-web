import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SYNC_HEADER } from "@/lib/game-sync/wire";

vi.mock("server-only", () => ({}));
vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://stub.supabase.co");
vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "stub-key");

const rpc = vi.fn();
vi.mock("@/lib/supabase/anon", () => ({ createAnonSupabase: () => ({ rpc }) }));

const sync = (await import("./sync/route")).POST;
const link = (await import("./link/route")).POST;
const unlink = (await import("./unlink/route")).POST;

const TOKEN = `ecl_${"a".repeat(43)}`;
const b64 = (text: string) => Buffer.from(text, "utf8").toString("base64");

function post(path: string, body: string, headers: Record<string, string> = {}) {
  return new NextRequest(`https://site.test/api/game/${path}`, { method: "POST", body, headers });
}

const signed = { authorization: `Bearer ${TOKEN}` };
const ok = { status: "ok", cursor: 3, more: false, acks: [], rejected: [], sets: [] };

beforeEach(() => {
  rpc.mockReset();
  rpc.mockResolvedValue({ data: ok, error: null });
});

describe("POST /api/game/sync", () => {
  const request = `${SYNC_HEADER}\ncursor 0\n`;

  it("hands the database a hash, never the token", async () => {
    await sync(post("sync", request, signed));
    const [, args] = rpc.mock.calls[0];
    expect(args.p_token_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(rpc.mock.calls)).not.toContain(TOKEN);
  });

  it("answers in lines the game can read, and is never cached", async () => {
    const response = await sync(post("sync", request, signed));
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("ok 3 0");
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("merges what it refused with what the database refused", async () => {
    rpc.mockResolvedValue({ data: { ...ok, rejected: ["Full"] }, error: null });
    const line = `put 0 ${b64("Bad")} - ECW1:AAAA`;
    const text = await (await sync(post("sync", `${request}${line}\n`, signed))).text();
    expect(text.split("\n")).toEqual(["ok 3 0", `rej ${b64("Full")}`, `rej ${b64("Bad")}`]);
  });

  it.each([
    ["no token", {}],
    ["a malformed token", { authorization: "Bearer nope" }],
    ["another scheme", { authorization: `Basic ${TOKEN}` }],
  ])("turns away %s without asking the database", async (_, headers) => {
    expect((await sync(post("sync", request, headers))).status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("tells a game it has been unlinked", async () => {
    rpc.mockResolvedValue({ data: { status: "unlinked" }, error: null });
    const response = await sync(post("sync", request, signed));
    expect(response.status).toBe(401);
    expect(await response.text()).toBe("unlinked");
  });

  it("tells a game to slow down", async () => {
    rpc.mockResolvedValue({ data: { status: "busy" }, error: null });
    const response = await sync(post("sync", request, signed));
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("2");
  });

  it("refuses a body it cannot read", async () => {
    expect((await sync(post("sync", "nonsense", signed))).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("refuses an oversized body before reading it", async () => {
    const response = await sync(post("sync", request, { ...signed, "content-length": String(5 * 1024 * 1024) }));
    expect(response.status).toBe(413);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("says so when the database fails, so the game retries", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "down" } });
    expect((await sync(post("sync", request, signed))).status).toBe(503);
  });
});

describe("POST /api/game/link", () => {
  it("answers with a token of the right shape and stores only its hash", async () => {
    rpc.mockResolvedValue({ data: "linked", error: null });
    const response = await link(post("link", `code abcd-1234\nlabel ${b64("Lee - Icecrown")}`));
    const text = await response.text();
    const [verb, token] = text.split(" ");
    expect(verb).toBe("ok");
    expect(token).toMatch(/^ecl_[A-Za-z0-9_-]{43}$/);
    expect(JSON.stringify(rpc.mock.calls)).not.toContain(token);
    expect(rpc.mock.calls[0][1]).toMatchObject({ p_label: "Lee - Icecrown" });
  });

  it("reads a code the way a person might type it", async () => {
    rpc.mockResolvedValue({ data: "linked", error: null });
    await link(post("link", "code ABCD1234"));
    const typed = rpc.mock.calls[0][1].p_code_hash;
    rpc.mockClear();
    await link(post("link", "code abcd-1234"));
    expect(rpc.mock.calls[0][1].p_code_hash).toBe(typed);
  });

  it("does not store the code it was given either", async () => {
    rpc.mockResolvedValue({ data: "linked", error: null });
    await link(post("link", "code ABCD-1234"));
    expect(JSON.stringify(rpc.mock.calls)).not.toContain("ABCD");
  });

  it("refuses a wrong or used code", async () => {
    rpc.mockResolvedValue({ data: "invalid", error: null });
    const response = await link(post("link", "code ABCD-1234"));
    expect(response.status).toBe(403);
    expect(await response.text()).toBe("invalid");
  });

  it("says when the account has too many games", async () => {
    rpc.mockResolvedValue({ data: "full", error: null });
    const response = await link(post("link", "code ABCD-1234"));
    expect(response.status).toBe(409);
    expect(await response.text()).toBe("full");
  });

  it("does not ask the database about something that cannot be a code", async () => {
    expect((await link(post("link", "code short"))).status).toBe(403);
    expect((await link(post("link", ""))).status).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("POST /api/game/unlink", () => {
  it("ends the token it was given", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    expect((await unlink(post("unlink", "", signed))).status).toBe(200);
    expect(rpc.mock.calls[0][0]).toBe("game_unlink");
    expect(rpc.mock.calls[0][1].p_token_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("needs a token", async () => {
    expect((await unlink(post("unlink", ""))).status).toBe(401);
  });
});
