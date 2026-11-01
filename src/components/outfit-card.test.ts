import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { OutfitPost } from "@/lib/data/types";

vi.mock("server-only", () => ({}));
vi.mock("@/app/actions", () => ({ upvoteOutfit: vi.fn() }));

import { OutfitPoster } from "./outfit-card";

const POST: OutfitPost = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "Raid night",
  author: "Someone",
  authorId: "22222222-2222-4222-8222-222222222222",
  authorVerified: false,
  code: `ECA1:${Buffer.from("slot 0 259306\nslot 4 1001735\n").toString("base64")}`,
  className: null,
  armor: null,
  race: null,
  category: "Armor",
  tags: [],
  upvotes: 12,
  createdAt: "2026-11-01T00:00:00.000Z",
  gallery: ["https://example.test/capture.webp"],
};

const render = (post: OutfitPost) => renderToStaticMarkup(createElement(OutfitPoster, { post }));

describe("a Showcase poster", () => {
  it("can be voted on where it is seen, beside its code", () => {
    const html = render(POST);
    expect(html).toContain('aria-label="Upvote, 12 votes"');
    expect(html).toContain('aria-label="Copy code"');
  });

  it("shows no count nobody could have recorded", () => {
    const html = render({ ...POST, upvotes: null });
    expect(html).not.toContain("Upvote");
    expect(html).toContain('aria-label="Copy code"');
  });
});
