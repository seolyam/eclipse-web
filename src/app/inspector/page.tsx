import type { Metadata } from "next";
import { Decoder } from "@/components/decoder";
import { HubTitle } from "@/components/hub";
import { repository } from "@/lib/data";

export const metadata: Metadata = { title: "Inspector" };

export default function InspectorPage() {
  return (
    <main id="main" className="wrap flex flex-col gap-6 py-10">
      <HubTitle
        title="Inspector"
        blurb={`Paste an ECA1: loadout or an ECW1: world code to see what it holds${repository.live ? ", edit it, or publish it with your screenshots" : " and edit it"}. Use Share in the game to get one.`}
      />
      <Decoder canPublish={repository.live} />
    </main>
  );
}
