"use client";

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { saveDisplayName } from "@/app/actions";
import { Avatar } from "@/components/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NAME_MAX, PROVIDER_NAMES } from "@/lib/account";
import type { Account } from "@/lib/data/types";
import { DISCORD_URL } from "@/lib/site";

interface AccountDialogProps {
  account: Account;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNamed: (name: string) => void;
}

/** Account settings, opened from the account menu. */
export function AccountDialog({ account, open, onOpenChange, onNamed }: AccountDialogProps) {
  const unnamed = account.name === null;
  const provider = account.provider ? PROVIDER_NAMES[account.provider] : null;
  const [name, setName] = useState(account.name ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  function save(event: FormEvent) {
    event.preventDefault();
    startSaving(async () => {
      const r = await saveDisplayName(name);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setError(null);
      setName(r.value);
      onNamed(r.value);
      onOpenChange(false);
      toast.success("Name saved");
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 border-line bg-surface p-6">
        <DialogHeader>
          <DialogTitle>{unnamed ? "Choose your public name" : "Settings"}</DialogTitle>
          <DialogDescription>
            {unnamed
              ? "It appears on the looks you publish. Use your Discord name if you have one, so people recognize you."
              : "This name appears on the looks you publish."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-3">
          <Avatar account={account} size={44} />
          <div className="min-w-0 text-sm">
            <p className="truncate text-ink">{account.name ?? "No name yet"}</p>
            {provider && <p className="text-ink-faint">Signed in with {provider}</p>}
          </div>
        </div>
        <form onSubmit={save} className="flex flex-col gap-3">
          <label htmlFor="account-name" className="text-sm text-ink-dim">Public name</label>
          <Input
            id="account-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={NAME_MAX}
            autoComplete="off"
            required
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "account-name-error" : undefined}
          />
          {error && <p id="account-name-error" role="alert" className="text-sm text-bad">{error}</p>}
          <button type="submit" className="btn btn--primary btn--block" disabled={saving}>
            {saving ? "Saving" : "Save name"}
          </button>
        </form>
        {/* A real form: signing out ends in a redirect, which a page refresh must not repeat. */}
        <form action="/auth/logout" method="post">
          <button type="submit" className="btn btn--ghost btn--block">Sign out</button>
        </form>
        <p className="text-xs text-ink-faint">
          To delete your account, ask us on{" "}
          <a href={DISCORD_URL} target="_blank" rel="noopener" className="text-amber underline underline-offset-2">Discord</a>.
        </p>
      </DialogContent>
    </Dialog>
  );
}
