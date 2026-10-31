"use client";

import { BookOpen, Braces, Download, Globe2, Images, LayoutGrid, Shirt } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut,
} from "@/components/ui/command";
import type { SearchEntry } from "@/lib/data/types";

const PAGES = [
  { href: "/wardrobe", label: "Wardrobe", icon: Shirt },
  { href: "/showcase", label: "Showcase", icon: Images },
  { href: "/inspector", label: "Inspect a code", icon: Braces },
  { href: "/world", label: "World presets", icon: Globe2 },
  { href: "/guide", label: "Setup guide", icon: BookOpen },
  { href: "/#features", label: "Features", icon: LayoutGrid },
  { href: "/#download", label: "Download Eclipse", icon: Download },
];

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const [outfits, setOutfits] = useState<SearchEntry[]>([]);
  const fetched = useRef(false);
  const router = useRouter();

  // Fetched on the first open, so the list is not in every page's HTML. A failed
  // fetch leaves the Pages group working and tries again on the next open.
  useEffect(() => {
    if (!open || fetched.current) return;
    fetched.current = true;
    fetch("/api/search")
      .then((r) => {
        if (!r.ok) throw new Error(r.statusText);
        return r.json() as Promise<SearchEntry[]>;
      })
      .then(setOutfits)
      .catch(() => {
        fetched.current = false;
      });
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("eclipse:search", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("eclipse:search", onOpen);
    };
  }, []);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Search Eclipse" description="Find an outfit or a page">
      {/* This shadcn CommandDialog has no cmdk root of its own: without Command
          the input has no store, and opening the menu takes the page down. */}
      <Command>
        <CommandInput placeholder="Search outfits and pages" />
        <CommandList>
        <CommandEmpty>Nothing matches that.</CommandEmpty>
        <CommandGroup heading="Pages">
          {PAGES.map(({ href, label, icon: Icon }) => (
            <CommandItem key={href} value={label} onSelect={() => go(href)}>
              <Icon strokeWidth={1.5} />
              {label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Outfits">
          {outfits.map((o) => (
            // The id keeps values unique: real sets can share a name.
            <CommandItem key={o.id} value={`${o.title} ${o.author ?? ""} ${o.id}`} onSelect={() => go(`/wardrobe/${o.id}`)}>
              <span className="truncate">{o.title}</span>
              {o.author && <CommandShortcut className="tracking-normal">{o.author}</CommandShortcut>}
            </CommandItem>
          ))}
        </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}

export function SearchTrigger() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("eclipse:search"))}
      className="bar__search"
    >
      Search
      <kbd className="font-sans">Ctrl K</kbd>
    </button>
  );
}
