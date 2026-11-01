"use client";

import { UserRound } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { saveDisplayName } from "@/app/actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NAME_MAX } from "@/lib/account";
import type { Account } from "@/lib/data/types";

/** The header's signed-in button. Opens by itself until a name is chosen. */
export function AccountDialog({ account, onNamed }: { account: Account; onNamed: (name: string) => void }) {
  const unnamed = account.name === null;
  const [open, setOpen] = useState(unnamed);
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
      setOpen(false);
      toast.success("Name saved");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="btn btn--ghost btn--sm bar__account" aria-label="Your account">
        <UserRound className="ico" />
        <span>{account.name ?? "Choose a name"}</span>
      </DialogTrigger>
      <DialogContent className="gap-5 border-line bg-surface p-6">
        <DialogHeader>
          <DialogTitle>{unnamed ? "Choose your public name" : "Your account"}</DialogTitle>
          <DialogDescription>
            {unnamed
              ? "It appears on the looks you publish. Use your Discord name if you have one, so people recognize you."
              : "This name appears on the looks you publish."}
          </DialogDescription>
        </DialogHeader>
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
      </DialogContent>
    </Dialog>
  );
}
