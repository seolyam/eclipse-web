import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Decoder } from "@/components/decoder";
import { RemoveGameSet } from "@/components/game-sync";
import { HubTitle } from "@/components/hub";
import { repository } from "@/lib/data";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = {
  title: "Your set",
  robots: { index: false, follow: false },
};

// RLS answers: a set that is not the visitor's is a set that does not exist. The
// Decoder brings the breakdown, editing and the publish form, and publishing from
// here writes a new public look. The private set stays as it was.
export default async function SetPage({ params }: Props) {
  const set = await repository.getGameSet((await params).id);
  if (!set) notFound();
  return (
    <main id="main" className="wrap flex flex-col gap-6 py-10">
      <Link href="/sets" className="flex items-center gap-1.5 self-start text-sm text-ink-dim hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Your sets
      </Link>
      <div className="flex items-start justify-between gap-3">
        <HubTitle title={set.name} blurb="Only you can see this set. Publish it below to share it with everyone." />
        <RemoveGameSet id={set.id} name={set.name} after="/sets" />
      </div>
      <Decoder initial={set.code} canPublish={repository.live} />
    </main>
  );
}
