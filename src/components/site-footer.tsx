import Image from "next/image";
import Link from "next/link";
import { DonateButton } from "@/components/site/support-dialog";
import { DISCORD_URL, GITHUB_URL, KOFI_URL, NARCISSUS_URL } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="foot">
      <div className="wrap foot__inner">
        <Link className="brand" href="/">
          <Image src="/assets/img/logo-320.webp" width={24} height={24} alt="" unoptimized />
          <span>Eclipse</span>
        </Link>
        <nav aria-label="Footer">
          <Link href="/#features">Features</Link>
          <Link href="/world">World presets</Link>
          <Link href="/guide">Setup guide</Link>
          <a href={GITHUB_URL} target="_blank" rel="noopener">GitHub</a>
          <a href={DISCORD_URL} target="_blank" rel="noopener">Discord</a>
          <a href={KOFI_URL} target="_blank" rel="noopener">Ko-fi</a>
          <DonateButton />
          <Link href="/privacy">Privacy</Link>
        </nav>
      </div>
      <p className="wrap foot__legal">
        Eclipse is a free fan project and is not affiliated with Blizzard Entertainment. World of Warcraft and the artwork
        shown are property of Blizzard Entertainment, Inc. Studio backdrops and item rings are from{" "}
        <a href={NARCISSUS_URL} target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-ink">Narcissus</a>{" "}
        by Peterodox (CC BY-NC-SA 4.0).
      </p>
    </footer>
  );
}
