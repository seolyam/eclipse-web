"use client";

import { ChevronDown, LogOut, Settings, Shirt } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { AccountDialog } from "@/components/account-dialog";
import { Avatar } from "@/components/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PROVIDER_NAMES } from "@/lib/account";
import type { Account } from "@/lib/data/types";

/** The header's signed-in control. Settings opens by itself until a name is chosen. */
export function AccountMenu({ account, onNamed }: { account: Account; onNamed: (name: string) => void }) {
  const [settings, setSettings] = useState(account.name === null);
  const signOut = useRef<HTMLFormElement>(null);
  const provider = account.provider ? PROVIDER_NAMES[account.provider] : null;

  return (
    <>
      {/* Not modal: a modal menu and the dialog it opens both lock the page, and fight over it. */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger className="btn btn--ghost btn--sm bar__account" aria-label="Your account">
          <Avatar account={account} />
          <span className="bar__account-name">{account.name ?? "Choose a name"}</span>
          <ChevronDown className="bar__account-caret" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-w-72">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <Avatar account={account} size={36} />
            <div className="min-w-0">
              <p className="truncate text-sm text-ink">{account.name ?? "No name yet"}</p>
              {provider && <p className="text-xs text-ink-faint">Signed in with {provider}</p>}
              {account.moderator && <p className="text-xs text-amber">Moderator</p>}
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href={`/wardrobe?author=${account.id}&sort=newest`}><Shirt />Your looks</Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setSettings(true)}><Settings />Settings</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => signOut.current?.requestSubmit()}><LogOut />Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {/* Outside the menu, which unmounts as soon as an item is chosen. A real form:
          signing out ends in a redirect, which a page refresh must not repeat. */}
      <form ref={signOut} action="/auth/logout" method="post" hidden />
      <AccountDialog account={account} open={settings} onOpenChange={setSettings} onNamed={onNamed} />
    </>
  );
}
