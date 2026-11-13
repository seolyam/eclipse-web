import { OutfitDrawer } from "@/components/outfit-drawer";

// The drawer lives in a layout, so it opens the moment a card is clicked (its loading state
// is prefetched with the link) and stays open while the look itself loads inside it.
export default function OutfitDrawerLayout({ children }: { children: React.ReactNode }) {
  return <OutfitDrawer>{children}</OutfitDrawer>;
}
