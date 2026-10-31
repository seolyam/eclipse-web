import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabase } from "@/lib/supabase/server";

// Where Discord OAuth lands. `next` stays on this site: an absolute or
// protocol-relative value would make this an open redirect.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/wardrobe";
  const target = next.startsWith("/") && !next.startsWith("//") ? next : "/wardrobe";
  if (code && supabaseConfigured()) {
    const db = await createServerSupabase();
    await db.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(new URL(target, origin));
}
