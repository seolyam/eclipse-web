import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Decoder } from "@/components/decoder";
import { RemoveGameSet } from "@/components/game-sync";
import { HubTitle } from "@/components/hub";
import { SignInOptions } from "@/components/sign-in-dialog";
import { repository } from "@/lib/data";
import { screenshotUrl, thumbOf } from "@/lib/screenshots";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = {
  title: "Your set",
  robots: { index: false, follow: false },
};

// RLS answers: a set that is not the visitor's is a set that does not exist. The
// Decoder brings the breakdown, editing and the publish form, and publishing from
// here writes a new public look. The private set stays as it was.
export default async function SetPage({ params }: Props) {
  // Signed out, the database refuses the read outright: ask for the sign-in instead.
  if (!(await repository.getAccount())) {
    return (
      <main id="main" className="wrap flex flex-col gap-6 py-10">
        <HubTitle title="Your set" blurb="Sign in to see the sets your game backed up." />
        {repository.live && (
          <div className="max-w-sm">
            <SignInOptions />
          </div>
        )}
      </main>
    );
  }
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
      {set.gallery.length > 0 && (
        // What the studio sent, where the player lands: the form holding it is below the breakdown.
        <section aria-label="Pictures from your game" className="flex flex-col gap-3 rounded-lg border border-amber/40 bg-amber/5 p-4">
          <p className="text-sm text-ink">
            Your game sent {set.gallery.length === 1 ? "1 picture" : `${set.gallery.length} pictures`} of this look.
            {" "}{set.gallery.length === 1 ? "It is" : "They are"} already in the publish form: give the look a title and publish it.
          </p>
          <ul className="flex flex-wrap gap-2">
            {set.gallery.map((path, i) => (
              <li key={path} className="relative aspect-video w-40 overflow-hidden rounded-md border border-line">
                <Image src={thumbOf(screenshotUrl(path))} alt={`Picture ${i + 1} from your game`} fill unoptimized sizes="10rem" className="object-cover" />
              </li>
            ))}
          </ul>
          <a href="#publish" className="pill self-start">Go to the publish form</a>
        </section>
      )}
      <Decoder initial={set.code} canPublish={repository.live} fromSet={{ id: set.id, gallery: set.gallery }} />
    </main>
  );
}
