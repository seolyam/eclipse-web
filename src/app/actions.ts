"use server";

import { revalidatePath } from "next/cache";
import { resolveOutfit, resolveWorld, type ResolvedOutfit, type ResolvedWorldPlace } from "@/lib/catalog";
import { decodeOutfit, OUTFIT_TAG, type Outfit } from "@/lib/codec/outfit";
import {
  displayNameSchema, MAX_SCREENSHOT_BYTES, SCREENSHOT_TYPES, submitOutfitSchema, type SubmitOutfit,
} from "@/lib/codec/schema";
import { decodeWorld, OUTFIT_WORLD_TAG } from "@/lib/codec/world";
import { repository } from "@/lib/data";
import { UPLOAD_PATH } from "@/lib/screenshots";

export type InspectResult =
  | { kind: "outfit"; outfit: Outfit; resolved: ResolvedOutfit; warnings: string[] }
  | { kind: "world"; places: ResolvedWorldPlace[] }
  | { kind: "error"; error: string };

/** What a pasted code holds, with the names the code itself does not carry. */
export async function inspectCode(text: string): Promise<InspectResult> {
  const head = text.trimStart().slice(0, 5).toUpperCase();
  if (head === OUTFIT_WORLD_TAG) {
    const r = decodeWorld(text);
    return r.ok ? { kind: "world", places: resolveWorld(r.places) } : { kind: "error", error: r.error };
  }
  const r = decodeOutfit(text);
  if (!r.ok) {
    return {
      kind: "error",
      error: head === OUTFIT_TAG || !text.trim() ? r.error : "That is not an Eclipse code. Codes start with ECA1: or ECW1:.",
    };
  }
  return { kind: "outfit", outfit: r.outfit, resolved: resolveOutfit(r.outfit), warnings: r.warnings };
}

export async function publishOutfit(
  input: SubmitOutfit,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = submitOutfitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const r = await repository.createOutfit({ ...parsed.data, tags: withCodeTags(parsed.data) });
  if (!r.ok) return r;
  revalidateHub();
  return { ok: true, id: r.value.id };
}

/** The Wardrobe's Mounts and Enchants filters, read from the code and not typed. */
function withCodeTags({ code, tags }: { code: string; tags: string[] }): string[] {
  const decoded = decodeOutfit(code);
  if (!decoded.ok) return tags;
  const { mount, mountFly, glow } = decoded.outfit;
  const found = [...(mount || mountFly ? ["mount"] : []), ...(glow.some(Boolean) ? ["enchant"] : [])];
  return [...new Set([...found, ...tags])].slice(0, 6);
}

function revalidateHub() {
  revalidatePath("/wardrobe");
  revalidatePath("/showcase");
  revalidatePath("/");
}

export async function uploadScreenshot(form: FormData) {
  const file = form.get("file");
  if (!(file instanceof File)) return { ok: false as const, error: "Choose a screenshot first." };
  if (!(SCREENSHOT_TYPES as readonly string[]).includes(file.type)) {
    return { ok: false as const, error: "Screenshots can be PNG, JPEG or WebP." };
  }
  if (file.size > MAX_SCREENSHOT_BYTES) return { ok: false as const, error: "Keep each screenshot under 4 MB." };
  return repository.uploadScreenshot(file);
}

/** A screenshot taken back off the form before publishing. Its slot is freed too. */
export async function removeScreenshot(path: string) {
  if (!UPLOAD_PATH.test(path)) return { ok: false as const, error: "That is not an uploaded screenshot." };
  return repository.removeScreenshot(path);
}

export async function deleteLook(id: string) {
  const r = await repository.deleteOutfit(id);
  if (r.ok) {
    revalidateHub();
    revalidatePath(`/wardrobe/${id}`);
  }
  return r;
}

export async function saveDisplayName(name: string) {
  const parsed = displayNameSchema.safeParse(name);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0].message };
  const r = await repository.setDisplayName(parsed.data);
  // Published looks show this name.
  if (r.ok) revalidateHub();
  return r;
}

export async function upvoteOutfit(id: string) {
  const r = await repository.upvote(id);
  if (r.ok) revalidateHub();
  return r;
}
