import { z } from "zod";
import { ARMOR_TYPES, CATEGORIES, CLASSES, RACE_LABEL } from "@/lib/domain";
import { decodeOutfit } from "./outfit";
import { decodeWorld } from "./world";

/** A loadout code the game would read, or the game's reason it would not. */
export const outfitCodeSchema = z.string().superRefine((text, ctx) => {
  const r = decodeOutfit(text);
  if (!r.ok) ctx.addIssue({ code: "custom", message: r.error });
});

export const worldCodeSchema = z.string().superRefine((text, ctx) => {
  const r = decodeWorld(text);
  if (!r.ok) ctx.addIssue({ code: "custom", message: r.error });
});

export const MAX_SCREENSHOTS = 6;
export const MAX_SCREENSHOT_BYTES = 4 * 1024 * 1024;
export const SCREENSHOT_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

const httpsImage = z.url().refine((u) => u.startsWith("https://"), "Use an https image link.");

export const submitOutfitSchema = z.object({
  title: z.string().trim().min(3, "Give it a title of at least 3 letters.").max(80),
  code: outfitCodeSchema,
  className: z.enum(CLASSES).optional(),
  armor: z.enum(ARMOR_TYPES).optional(),
  race: z.enum(Object.keys(RACE_LABEL) as [string, ...string[]]).optional(),
  category: z.enum(CATEGORIES),
  tags: z.array(z.string().trim().min(1).max(24)).max(6),
  gallery: z.array(httpsImage).max(MAX_SCREENSHOTS, `Keep it to ${MAX_SCREENSHOTS} screenshots.`).default([]),
});
export type SubmitOutfit = z.input<typeof submitOutfitSchema>;
export type ParsedOutfit = z.output<typeof submitOutfitSchema>;
