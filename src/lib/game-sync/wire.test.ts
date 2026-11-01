import { describe, expect, it } from "vitest";
import {
  cleanSetName,
  formatSyncAnswer,
  parseLinkRequest,
  parseSyncRequest,
  SYNC_HEADER,
} from "./wire";

const b64 = (text: string) => Buffer.from(text, "utf8").toString("base64");
const body = (...lines: string[]) => [SYNC_HEADER, ...lines].join("\n");

describe("a sync request", () => {
  it("reads a cursor, a label, saves and deletes", () => {
    const parsed = parseSyncRequest(
      body("cursor 12", `label ${b64("Lee - Icecrown")}`, `put 3 ${b64("Raid")} ${b64("inv_helm")} ECA1:AAAA`, `del 4 ${b64("Town")}`),
    );
    expect(parsed).toEqual({
      cursor: 12,
      label: "Lee - Icecrown",
      changes: [
        { name: "Raid", icon: "inv_helm", code: "ECA1:AAAA", base: 3 },
        { name: "Town", icon: "", code: null, base: 4 },
      ],
      rejected: [],
    });
  });

  it("reads a set with no icon", () => {
    expect(parseSyncRequest(body("cursor 0", `put 0 ${b64("Raid")} - ECA1:AAAA`))?.changes[0].icon).toBe("");
  });

  it("carries names the game can write that plain text could not", () => {
    const name = "Ñandú ⚔ raid set";
    expect(parseSyncRequest(body("cursor 0", `put 0 ${b64(name)} - ECA1:AAAA`))?.changes[0].name).toBe(name);
  });

  it("tolerates Windows line endings and a trailing newline", () => {
    expect(parseSyncRequest(`${SYNC_HEADER}\r\ncursor 5\r\n`)?.cursor).toBe(5);
  });

  it.each([
    ["no header", "cursor 0"],
    ["another version", "eclipse-sync 2\ncursor 0"],
    ["no cursor", SYNC_HEADER],
    ["a negative cursor", body("cursor -1")],
    ["a cursor past what a number can hold", body("cursor 99999999999999999999")],
    ["an unknown line", body("cursor 0", "drop everything")],
    ["a short put", body("cursor 0", "put 0 abc")],
    ["a non-numeric base", body("cursor 0", `put x ${b64("Raid")} - ECA1:AAAA`)],
    ["more than a batch", body("cursor 0", ...Array.from({ length: 101 }, (_, i) => `del 0 ${b64(`set ${i}`)}`))],
  ])("refuses %s", (_, text) => {
    expect(parseSyncRequest(text)).toBeNull();
  });

  // A set the game can never send must not stop every other set from syncing, and
  // must not be retried forever. So it is refused alone, and the game records that.
  it.each([
    ["a code that is not a loadout", `put 0 ${b64("Raid")} - ECW1:AAAA`],
    ["a code with stray characters", `put 0 ${b64("Raid")} - ECA1:AA'A`],
    ["a code past the cap", `put 0 ${b64("Raid")} - ECA1:${"A".repeat(32768)}`],
    ["an icon past the cap", `put 0 ${b64("Raid")} ${b64("x".repeat(65))} ECA1:AAAA`],
  ])("sets aside %s and keeps the rest", (_, line) => {
    const parsed = parseSyncRequest(body("cursor 0", line, `put 0 ${b64("Town")} - ECA1:AAAA`));
    expect(parsed?.rejected).toEqual(["Raid"]);
    expect(parsed?.changes.map((c) => c.name)).toEqual(["Town"]);
  });

  it.each([
    ["too long", "x".repeat(81)],
    ["empty", ""],
    ["holding a NUL, which Postgres cannot store", "a\u0000b"],
    ["with brackets the game would strip", "[Raid]"],
  ])("sets aside a name that is %s", (_, name) => {
    const parsed = parseSyncRequest(body("cursor 0", `put 0 ${b64(name)} - ECA1:AAAA`));
    expect(parsed?.changes).toEqual([]);
    expect(parsed?.rejected).toHaveLength(1);
  });

  it("clips a label rather than refusing a sync over it", () => {
    expect(parseSyncRequest(body("cursor 0", `label ${b64("x".repeat(200))}`))?.label).toHaveLength(80);
  });
});

describe("a sync answer", () => {
  it("writes every kind of line the game reads", () => {
    const text = formatSyncAnswer({
      cursor: 9,
      more: true,
      acks: [{ name: "Raid", rev: 7 }],
      rejected: ["Too big"],
      sets: [
        { name: "Town", icon: "inv_helm", code: "ECA1:AAAA", rev: 8 },
        { name: "Bare", icon: "", code: "ECA1:BBBB", rev: 8 },
        { name: "Gone", icon: "", code: null, rev: 9 },
      ],
    });
    expect(text.split("\n")).toEqual([
      "ok 9 1",
      `ack 7 ${b64("Raid")}`,
      `rej ${b64("Too big")}`,
      `set 8 ${b64("Town")} ${b64("inv_helm")} ECA1:AAAA`,
      `set 8 ${b64("Bare")} - ECA1:BBBB`,
      `del 9 ${b64("Gone")}`,
    ]);
  });

  it("is one line when nothing happened", () => {
    expect(formatSyncAnswer({ cursor: 0, more: false, acks: [], rejected: [], sets: [] })).toBe("ok 0 0");
  });
});

describe("a link request", () => {
  it("reads the code and the label", () => {
    expect(parseLinkRequest(`code ABCD-1234\nlabel ${b64("Lee - Icecrown")}`)).toEqual({
      code: "ABCD-1234",
      label: "Lee - Icecrown",
    });
  });

  it("needs a code", () => {
    expect(parseLinkRequest(`label ${b64("Lee")}`)).toBeNull();
  });
});

describe("a set's name", () => {
  it("is filed the way the game files it", () => {
    expect(cleanSetName("  [Raid] set\n")).toBe("Raid set");
  });

  it("is never empty, because the game cannot file that", () => {
    expect(cleanSetName("[]")).toBe("Look");
  });

  it("fits the column", () => {
    expect(cleanSetName("x".repeat(200))).toHaveLength(80);
  });
});
