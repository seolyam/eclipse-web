"use client";

import { useRouter } from "next/navigation";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

// Opened by the intercepted route, so a copied /wardrobe/<id> link still lands on
// the full page and Back still closes the drawer with the filters intact.
export function OutfitDrawer({ title, children }: { title: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <Sheet defaultOpen onOpenChange={(open) => !open && router.back()}>
      <SheetContent
        className="gap-0 overflow-y-auto border-line bg-void data-[side=right]:w-full data-[side=right]:sm:max-w-5xl"
        // Radix would focus the first focusable piece, whose tooltip then opens
        // unasked and takes the first Escape. The drawer itself takes focus.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          (event.currentTarget as HTMLElement).focus();
        }}
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>Pieces, mount and code for this outfit.</SheetDescription>
        </SheetHeader>
        <div className="p-4 pt-10">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
