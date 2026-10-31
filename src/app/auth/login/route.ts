import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { origin } = request.nextUrl;
  if (!supabaseConfigured()) return NextResponse.redirect(new URL("/wardrobe", origin));
  const db = await createServerSupabase();
  const { data, error } = await db.auth.signInWithOAuth({
    provider: "discord",
    options: { redirectTo: `${origin}/auth/callback` },
  });
  if (error || !data.url) return NextResponse.redirect(new URL("/wardrobe", origin));
  return NextResponse.redirect(data.url);
}
