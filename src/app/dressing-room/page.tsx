import type { Metadata } from "next";
import { DressingRoom } from "@/components/dressing-room";
import { HubTabs, HubTitle } from "@/components/hub";
import { catalogCounts } from "@/lib/catalog";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("/dressing-room");

export default function DressingRoomPage() {
  return (
    <main id="main" className="wrap flex flex-col gap-5 py-10">
      <HubTitle title="Dressing room" blurb="Choose a piece for each slot, copy the code, then use Import on the Loadout page in the game." />
      <HubTabs current="/dressing-room" />
      <DressingRoom itemCount={catalogCounts.items} />
    </main>
  );
}
