import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { ResolvedOutfit, ResolvedSlot } from "@/lib/catalog";
import type { OutfitPost } from "@/lib/data/types";
import { StudioPane } from "./studio-pane";

const piece = (slot: number, display: number | null): ResolvedSlot =>
  ({ slot, label: "", item: 40000 + slot, name: `Piece ${slot}`, icon: null, quality: 4, display });

const post = { id: "look-1", title: "Raid night", code: "", className: null, categories: ["Armor"], gallery: [] } as unknown as OutfitPost;

const render = (slots: ResolvedSlot[]) =>
  renderToStaticMarkup(
    createElement(TooltipProvider, null, createElement(StudioPane, {
      post,
      resolved: { slots, race: null, raceKey: null, sex: null } as unknown as ResolvedOutfit,
    })),
  );

describe("a look's pieces", () => {
  it("marks a piece the 3D preview cannot draw", () => {
    const html = render([piece(0, 179769), piece(4, null)]);
    expect(html.match(/not in 3D/g)).toHaveLength(1);
  });

  it("marks nothing when every piece has a model", () => {
    expect(render([piece(0, 179769), piece(4, 168954)])).not.toContain("not in 3D");
  });
});
