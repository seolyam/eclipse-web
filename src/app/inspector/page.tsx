import type { Metadata } from "next";
import { Decoder, type RemixOf } from "@/components/decoder";
import { HubTitle } from "@/components/hub";
import { getOutfit, repository } from "@/lib/data";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("/inspector");

type Props = { searchParams: Promise<{ code?: string | string[]; from?: string | string[] }> };

// Above any loadout the Dressing room writes, and far below what a URL can carry.
const MAX_LINKED_CODE = 8192;

/** Only a look someone published can be credited. A game set has nobody to credit. */
async function original(id: unknown): Promise<RemixOf | null> {
  if (typeof id !== "string" || !id) return null;
  const post = await getOutfit(id);
  return post?.authorId ? { id: post.id, title: post.title, author: post.author } : null;
}

export default async function InspectorPage({ searchParams }: Props) {
  const { code, from } = await searchParams;
  const linked = typeof code === "string" && code.length <= MAX_LINKED_CODE ? code : "";
  const remixOf = linked && repository.live ? await original(from) : null;
  return (
    <main id="main" className="wrap flex flex-col gap-6 py-10">
      <HubTitle
        title="Inspector"
        blurb={`Paste an ECA1: loadout or an ECW1: world code to see what it holds${repository.live ? ", edit it, or publish it with your screenshots" : " and edit it"}. Use Share in the game to get one.`}
      />
      <Decoder initial={linked} canPublish={repository.live} remixOf={remixOf} />
    </main>
  );
}
