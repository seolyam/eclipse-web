import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { DISCORD_URL } from "@/lib/site";

export const metadata: Metadata = pageMetadata("/privacy");

const UPDATED = "November 1, 2026";

const SECTIONS = [
  {
    id: "visiting",
    title: "If you only visit",
    points: [
      "You do not need an account. The site has no ads, no analytics and no tracking cookies.",
      "Our hosting provider handles each request, and that includes your IP address and browser details.",
      "The home page shows a video from YouTube. Its preview image loads from YouTube when the section appears, so YouTube sees that request. The player itself uses YouTube's privacy-enhanced mode.",
      "The site remembers that you have seen the support message, in your browser only, until you close the tab.",
    ],
  },
  {
    id: "account",
    title: "If you sign in",
    points: [
      "You sign in with Discord or Google. We never see your password.",
      "The provider gives us your email address, your name or username, your profile picture and an account ID. These stay private.",
      "Your profile picture appears only to you, in your account menu.",
      "Discord accounts use their Discord username as their public name. Google accounts choose one the first time they sign in, so a real name is not published.",
      "Cookies keep you signed in and return you to the page you were on.",
    ],
  },
  {
    id: "public",
    title: "What is public",
    points: [
      "Your public name, and any look you publish with its title, code, tags and screenshots. Anyone can see these without an account.",
      "How many votes a look has. Which looks you voted for stays private.",
      "Uploaded screenshots are compressed and their file details are removed, including any location data. Still, avoid uploading anything you would not want public, and remember a screenshot can show your character or account names.",
    ],
  },
  {
    id: "services",
    title: "Who handles your data",
    points: [
      "Service providers host the website and store accounts, looks and screenshots for us.",
      "Discord and Google handle signing in, under their own privacy policies.",
      "Links to downloads, code and donations take you to other sites, which have their own policies.",
      "We do not sell your data or use it for advertising.",
    ],
  },
  {
    id: "control",
    title: "Your choices",
    points: [
      "Change your public name at any time, from Settings in your account menu.",
      "Delete any look you published, from the look's page. Its screenshots are deleted with it.",
      "To delete your whole account, ask us on Discord. We keep your data until you delete it or ask us to.",
      "Moderators can remove looks that break the community's rules.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main id="main" className="wrap flex flex-col gap-10 py-10">
      <div>
        <h1 className="text-3xl leading-tight">Privacy</h1>
        <p className="max-w-prose text-sm text-ink-dim">
          What this website stores, what is public, and how to remove it. Last updated {UPDATED}.
        </p>
      </div>

      {SECTIONS.map((s) => (
        <section key={s.id} aria-labelledby={s.id}>
          <h2 id={s.id} className="text-xl">{s.title}</h2>
          <ul className="mt-2 flex max-w-prose list-disc flex-col gap-1.5 pl-5 text-sm text-ink-dim">
            {s.points.map((point) => <li key={point}>{point}</li>)}
          </ul>
        </section>
      ))}

      <section aria-labelledby="contact" className="rounded-md border border-line bg-surface p-5">
        <h2 id="contact" className="text-xl">Questions</h2>
        <p className="mt-1 max-w-prose text-sm text-ink-dim">
          Eclipse is a free fan project. Ask us anything about this page on{" "}
          <a href={DISCORD_URL} target="_blank" rel="noopener" className="text-amber underline underline-offset-2">Discord</a>.
          If this page changes, the date above changes with it. It covers
          this website; for the game overlay, see the <Link href="/guide" className="text-amber underline underline-offset-2">setup guide</Link>.
        </p>
      </section>
    </main>
  );
}
