import type { Metadata } from "next";
import { OPEN_GRAPH, SITE_DESCRIPTION, siteUrl } from "@/lib/site";

/** What search results and link previews say about each page. The sitemap lists these too. */
export const PAGES = {
  "/wardrobe": {
    title: "Wardrobe: WoW 3.3.5a looks to copy",
    description:
      "Browse World of Warcraft 3.3.5a looks by class, race and armor type. Copy a look's code and import it with the free Eclipse overlay.",
  },
  "/showcase": {
    title: "Showcase: WoW 3.3.5a screenshots",
    description:
      "Studio screenshots of World of Warcraft 3.3.5a looks from Eclipse players. Each one opens on its exact equipment, with a code to copy.",
  },
  "/inspector": {
    title: "Inspector: read Eclipse codes",
    description:
      "Paste an Eclipse loadout or world code to see what it holds, edit it, or publish it with your screenshots. Use Share in the game to get one.",
  },
  "/world": {
    title: "World presets for WoW 3.3.5a",
    description:
      "Colour presets for places in World of Warcraft 3.3.5a, with rows for Ground, Buildings, Objects and Grass. Copy a code and import it with Eclipse.",
  },
  "/guide": {
    title: "Setup guide for WoW 3.3.5a",
    description:
      "Set up Eclipse for World of Warcraft 3.3.5a in about two minutes. There is no installer, and nothing is written to the game's own files.",
  },
  "/privacy": {
    title: "Privacy",
    description: "What the Eclipse website stores, what is public, and how to remove it if you change your mind.",
  },
} as const;

export type PagePath = keyof typeof PAGES;

/**
 * The canonical is the bare path, so a filtered or paged address such as
 * /wardrobe?class=Mage counts towards the page instead of competing with it.
 */
export function pageMetadata(path: PagePath): Metadata {
  const { title, description } = PAGES[path];
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { ...OPEN_GRAPH, title: `${title} · Eclipse`, description, url: path },
  };
}

/**
 * Tells search engines the site's name and what Eclipse is. Goes in a script tag, so
 * "<" is escaped. No rating: structured data must only state what the page can show.
 */
export function siteStructuredData() {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", name: "Eclipse", url: `${siteUrl}/` },
      {
        "@type": "SoftwareApplication",
        name: "Eclipse",
        description: SITE_DESCRIPTION,
        url: `${siteUrl}/`,
        applicationCategory: "GameApplication",
        operatingSystem: "Windows",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      },
    ],
  }).replace(/</g, "\\u003c");
}
