import type { Metadata } from "next";
import Link from "next/link";
import { HELP, helpParts } from "@/lib/help";
import { pageMetadata } from "@/lib/seo";
import { DISCORD_URL } from "@/lib/site";

export const metadata: Metadata = pageMetadata("/guide");

const STEPS = [
  {
    title: "Put the files beside Wow.exe",
    body: "Copy dinput8.dll and the Eclipse folder into your World of Warcraft 3.3.5a folder (build 12340), next to Wow.exe.",
  },
  {
    title: "Start the game and press F2",
    body: "F2 opens the overlay. You can change the key in its settings.",
  },
  {
    title: "Wear a look from the Community Gallery",
    body: "Copy a code here, open the Loadout page, and press Import. It lights up when your clipboard holds a code, wears the look, and keeps it with your loadouts as Imported.",
  },
  {
    title: "Color a place",
    body: "Copy a world code from another player, open Colors > World, and press Import. The game jumps to the place the code names.",
  },
  {
    title: "Share yours",
    body: "Share on the Loadout page, or on any styled place in Colors > World, copies a code. Paste it into Import, on the Loadouts page of the Dressing room, to see what it holds.",
  },
];

const TRAVELS = [
  "Your item slots, including slots you hid",
  "Sheathe positions and weapon glows",
  "Creature morph, mount and scale",
  "Race, sex and appearance",
  "Your character colours",
];

export default function GuidePage() {
  return (
    <main id="main" className="wrap flex flex-col gap-10 py-10">
      <div>
        <h1 className="text-3xl leading-tight">Setup</h1>
        <p className="text-sm text-ink-dim">About two minutes. There is no installer, and nothing is written to the game&apos;s own files.</p>
      </div>

      <ol className="flex flex-col">
        {STEPS.map((s, i) => (
          <li key={s.title} className="grid grid-cols-[2rem_1fr] gap-x-3 border-b border-line py-4 first:pt-0 last:border-0">
            <span className="nums font-mono text-sm text-amber">{i + 1}</span>
            <div>
              <h2 className="text-base">{s.title}</h2>
              <p className="max-w-prose text-sm text-ink-dim">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <section aria-labelledby="sync" className="rounded-md border border-line bg-surface p-5">
        <h2 id="sync" className="text-xl">See other players&apos; looks</h2>
        <p className="mt-1 max-w-prose text-sm text-ink-dim">
          Turn on the switch on the Multiplayer page. Players with Eclipse on the same realm then see each other&apos;s looks through the Eclipse relay. Players without it see your real gear.
        </p>
        <h3 className="mt-4 text-sm">What the relay carries</h3>
        <ul className="mt-1 list-disc pl-5 text-sm text-ink-dim">
          {TRAVELS.map((t) => <li key={t}>{t}</li>)}
        </ul>
        <p className="mt-3 max-w-prose text-sm text-ink-dim">
          It carries no position, movement, combat or chat. The switches on that page choose which parts of your look travel.
        </p>
      </section>

      <section aria-labelledby="help">
        <h2 id="help" className="text-xl">If something goes wrong</h2>
        <dl className="mt-2 flex flex-col gap-4">
          {HELP.map((h) => (
            <div key={h.id}>
              <dt className="text-sm">{h.question}</dt>
              <dd className="mt-1 max-w-prose text-sm text-ink-dim">
                {helpParts(h.answer).map((p, i) => (p.code ? <code key={i}>{p.text}</code> : p.text))}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 max-w-prose text-sm text-ink-dim">
          Still stuck?{" "}
          <a href={DISCORD_URL} target="_blank" rel="noopener" className="text-amber underline underline-offset-2">Ask in the Eclipse Discord</a>
          , in the bug reports channel.
        </p>
      </section>
      <section aria-labelledby="remove">
        <h2 id="remove" className="text-xl">Remove it</h2>
        <p className="mt-1 max-w-prose text-sm text-ink-dim">
          Delete dinput8.dll and the Eclipse folder. The game goes back to how it was.
        </p>
        <p className="mt-3 text-sm">
          <Link href="/community-gallery" className="text-amber underline underline-offset-2">Browse the Community Gallery</Link>
        </p>
      </section>
    </main>
  );
}
