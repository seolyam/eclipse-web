import { describe, expect, it } from "vitest";
import { pageMetadata, PAGES, type PagePath } from "@/lib/seo";

const paths = Object.keys(PAGES) as PagePath[];
const SUFFIX = " · Eclipse";

describe("what search results show for each page", () => {
  it.each(paths)("%s fits a search result", (path) => {
    const { title, description } = PAGES[path];
    expect((title + SUFFIX).length).toBeLessThanOrEqual(60);
    expect(description.length).toBeGreaterThanOrEqual(70);
    expect(description.length).toBeLessThanOrEqual(160);
  });

  it("describes every page differently, because duplicates compete with each other", () => {
    const unique = (key: "title" | "description") => new Set(paths.map((path) => PAGES[path][key])).size;
    expect(unique("title")).toBe(paths.length);
    expect(unique("description")).toBe(paths.length);
  });

  it("names no vendor or location", () => {
    expect(JSON.stringify(PAGES)).not.toMatch(/supabase|vercel|cloudflare|paris|france/i);
  });
});

describe("a page's metadata", () => {
  it("points filtered and paged addresses at the page itself", () => {
    expect(pageMetadata("/wardrobe").alternates?.canonical).toBe("/wardrobe");
  });

  it("previews as that page when its link is shared, not as the home page", () => {
    const { openGraph } = pageMetadata("/wardrobe");
    expect(openGraph?.url).toBe("/wardrobe");
    expect(openGraph?.title).toBe(`${PAGES["/wardrobe"].title}${SUFFIX}`);
    expect(openGraph?.description).toBe(PAGES["/wardrobe"].description);
  });

  it("keeps the shared preview image", () => {
    expect(pageMetadata("/guide").openGraph?.images).toBeDefined();
  });
});
