import { describe, expect, it } from "vitest";
import { wardrobeParsers } from "@/lib/search-params";

describe("the Wardrobe's author filter", () => {
  it("takes an account id", () => {
    const id = "6a96974b-3368-40f5-a474-5a31c69e798c";
    expect(wardrobeParsers.author.parse(id)).toBe(id);
  });

  it("drops anything else, because Postgres would reject it", () => {
    expect(wardrobeParsers.author.parse("not-a-uuid")).toBeNull();
  });
});
