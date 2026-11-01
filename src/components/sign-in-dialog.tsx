"use client";

import { usePathname } from "next/navigation";
import { Icon } from "@/components/site/icons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { OAuthProvider } from "@/lib/supabase/config";

const OPTIONS: { provider: OAuthProvider; label: string; mark: React.ReactNode }[] = [
  { provider: "discord", label: "Continue with Discord", mark: <Icon id="i-discord" /> },
];

// Plain links: the route answers with a redirect to the provider, not a page.
export function SignInOptions() {
  const next = encodeURIComponent(usePathname());
  return (
    <div className="flex flex-col gap-2">
      {OPTIONS.map(({ provider, label, mark }) => (
        <a key={provider} className="btn btn--ghost btn--block" href={`/auth/login?provider=${provider}&next=${next}`}>
          {mark}
          <span>{label}</span>
        </a>
      ))}
    </div>
  );
}

/** `pending` keeps its place in the bar until we know who is here. */
export function SignInDialog({ pending = false }: { pending?: boolean }) {
  return (
    <Dialog>
      <DialogTrigger className={`btn btn--ghost btn--sm bar__sign-in ${pending ? "invisible" : ""}`}>Sign in</DialogTrigger>
      <DialogContent className="gap-5 border-line bg-surface p-6">
        <DialogHeader>
          <DialogTitle>Sign in to Eclipse</DialogTitle>
          <DialogDescription>Publish your looks, upload screenshots and vote.</DialogDescription>
        </DialogHeader>
        <SignInOptions />
      </DialogContent>
    </Dialog>
  );
}
