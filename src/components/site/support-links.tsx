import { Icon, type IconId } from "@/components/site/icons";
import { DISCORD_URL, GITHUB_URL, KOFI_URL } from "@/lib/site";

interface Way {
  href: string;
  icon: IconId;
  tone: string;
  label: string;
  short?: string;
  note: string;
}

const PAGE: Way[] = [
  { href: KOFI_URL, icon: "i-kofi", tone: "kofi", label: "Ko-fi", note: "Support development" },
  { href: GITHUB_URL, icon: "i-star", tone: "star", label: "Star on GitHub", note: "Free, and it helps others find Eclipse" },
  { href: DISCORD_URL, icon: "i-discord", tone: "discord", label: "Discord", note: "Updates, help and showcases" },
];

const DIALOG: Way[] = [
  { href: DISCORD_URL, icon: "i-discord", tone: "discord", label: "Join the Discord", short: "Discord", note: "Updates, help and showcases" },
  { href: KOFI_URL, icon: "i-kofi", tone: "kofi", label: "Support on Ko-fi", short: "Ko-fi", note: "Keep the project going" },
  { href: GITHUB_URL, icon: "i-star", tone: "star", label: "Star the repository", short: "GitHub", note: "Free, and it helps others find Eclipse" },
];

export function SupportLinks({ dialog = false }: { dialog?: boolean }) {
  return (dialog ? DIALOG : PAGE).map((w) => (
    <a key={w.href} className="slink" href={w.href} target="_blank" rel="noopener">
      <span className={`slink__icon slink__icon--${w.tone}`}><Icon id={w.icon} /></span>
      <span className="slink__text">
        <strong>
          {w.short ? (
            <>
              <span className="slink__full">{w.label}</span>
              <span className="slink__short">{w.short}</span>
            </>
          ) : w.label}
        </strong>
        <span>{w.note}</span>
      </span>
      <Icon id="i-arrow" className="slink__arrow" />
    </a>
  ));
}
