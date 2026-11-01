"use client";

import { Menu } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AccountMenu } from "@/components/account-menu";
import { SearchTrigger } from "@/components/command-menu";
import { SignInDialog, SignInOptions } from "@/components/sign-in-dialog";
import { Icon } from "@/components/site/icons";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DISCORD_URL, GITHUB_URL } from "@/lib/site";
import { useAccount } from "@/lib/use-account";

// The logo is the way home, and the hub's tabs reach Showcase and the Dressing room.
const NAV = [
  { href: "/wardrobe", label: "Wardrobe", routes: ["/wardrobe", "/showcase", "/dressing-room"] },
  { href: "/inspector", label: "Inspector", routes: ["/inspector"] },
  { href: "/#download", label: "Download", section: "download" },
  { href: "/#support", label: "Support", section: "support" },
];
const SECTIONS = ["top", "features", "download", "support"];

/** The section in the middle of the screen, on the one page that has sections. */
function useCurrentSection(active: boolean) {
  const [section, setSection] = useState("top");
  useEffect(() => {
    if (!active) return;
    const seen = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) setSection(e.target.id);
    }, { rootMargin: "-45% 0px -50% 0px" });
    for (const id of SECTIONS) {
      const el = document.getElementById(id);
      if (el) seen.observe(el);
    }
    return () => seen.disconnect();
  }, [active]);
  return section === "features" ? "top" : section;
}

function useScrolled() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return scrolled;
}

const AUTH_NOTICES: Record<string, () => void> = {
  "signed-in": () => toast.success("You're signed in"),
  failed: () => toast.error("Sign-in did not finish. Try again."),
  cancelled: () => toast.error("Sign-in was cancelled."),
};

/** Says how a sign-in ended, then takes the note out of the address. */
function useAuthNotice() {
  useEffect(() => {
    const url = new URL(window.location.href);
    const notice = AUTH_NOTICES[url.searchParams.get("auth") ?? ""];
    if (!notice) return;
    url.searchParams.delete("auth");
    window.history.replaceState(null, "", url);
    // The next task: the Toaster comes later in the layout and is not listening yet.
    const timer = setTimeout(notice);
    return () => clearTimeout(timer);
  }, []);
}

export function SiteHeader({ signIn }: { signIn: boolean }) {
  const pathname = usePathname();
  const home = pathname === "/";
  const scrolled = useScrolled();
  const section = useCurrentSection(home);
  const [menu, setMenu] = useState(false);
  const [account, setAccount, checking] = useAccount(signIn);
  useAuthNotice();

  const isActive = (n: (typeof NAV)[number]) =>
    n.section ? home && section === n.section : Boolean(n.routes?.some((r) => pathname.startsWith(r)));

  return (
    <header className={`bar ${home ? "" : "bar--page"} ${!home || scrolled ? "is-solid" : ""}`}>
      <div className="bar__inner">
        <Link className="brand" href="/" aria-label="Eclipse home">
          <Image src="/assets/img/logo-96.webp" width={28} height={28} alt="" unoptimized />
          <span>Eclipse</span>
        </Link>
        <nav className="bar__nav" aria-label="Primary">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={isActive(n) ? "is-active" : undefined}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="bar__actions">
          <SearchTrigger />
          {account ? <AccountMenu account={account} onNamed={(name) => setAccount({ ...account, name })} /> : signIn && <SignInDialog pending={checking} />}
          <a className="btn btn--primary btn--sm" href={DISCORD_URL} target="_blank" rel="noopener" aria-label="Join the Discord">
            <Icon id="i-discord" /><span>Discord</span>
          </a>
          <Sheet open={menu} onOpenChange={setMenu}>
            <SheetTrigger className="icon-btn bar__menu" aria-label="Open the menu">
              <Menu />
            </SheetTrigger>
            <SheetContent className="w-72 border-line bg-surface">
              <SheetHeader>
                <SheetTitle>Eclipse</SheetTitle>
                <SheetDescription className="sr-only">Site navigation</SheetDescription>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4 text-ink-dim" aria-label="Mobile">
                {NAV.map((n) => (
                  <Link key={n.href} href={n.href} onClick={() => setMenu(false)} className="rounded-md px-3 py-2 hover:bg-surface-high hover:text-ink">
                    {n.label}
                  </Link>
                ))}
                <a href={GITHUB_URL} target="_blank" rel="noopener" className="rounded-md px-3 py-2 hover:bg-surface-high hover:text-ink">
                  GitHub
                </a>
              </nav>
              {signIn && !account && !checking && (
                <div className="mx-4 mt-2 border-t border-line pt-4">
                  <SignInOptions />
                </div>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
