import { supabaseUrl } from "@/lib/supabase/config";

// A post's gallery holds storage paths, never links: <owner>/<uuid>.avif.

export const SCREENSHOT_BUCKET = "showcase";

export const UPLOAD_PATH = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(?:avif|webp)$/;

/** The small copy stored beside a screenshot, from its path or its link. */
export const thumbOf = (pathOrUrl: string) => pathOrUrl.replace(/\.(avif|webp)$/, "-thumb.$1");

export const screenshotUrl = (path: string) =>
  `${supabaseUrl}/storage/v1/object/public/${SCREENSHOT_BUCKET}/${path}`;
