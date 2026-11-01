import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_PATH, AUTH_NEXT_COOKIE, safeNext } from "@/lib/account";
import { exchangeGoogleCode, GOOGLE_NONCE_COOKIE, GOOGLE_STATE_COOKIE } from "@/lib/google-sign-in";
import { supabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabase } from "@/lib/supabase/server";

/** Why the sign-in did not finish, for the notice on the page it lands on. */
async function finishSignIn(request: NextRequest): Promise<"failed" | "cancelled" | null> {
  const params = request.nextUrl.searchParams;
  if (params.get("error") === "access_denied") return "cancelled";

  const code = params.get("code");
  const state = request.cookies.get(GOOGLE_STATE_COOKIE)?.value;
  const nonce = request.cookies.get(GOOGLE_NONCE_COOKIE)?.value;
  // Only the browser that started this sign-in holds the state. Without the check, a
  // link carrying someone else's code would sign a visitor in to that person's account.
  if (!code || !state || !nonce || params.get("state") !== state || !supabaseConfigured()) return "failed";

  const tokens = await exchangeGoogleCode(code, request.nextUrl.origin);
  if (!tokens) return "failed";

  const db = await createServerSupabase();
  const { error } = await db.auth.signInWithIdToken({
    provider: "google",
    token: tokens.id_token,
    access_token: tokens.access_token,
    nonce,
  });
  if (!error) return null;
  console.error("Sign-in failed:", error.message);
  return "failed";
}

// Where a Google sign-in lands. The page to return to is checked again here: a cookie
// can be set by hand, and this must not become an open redirect.
export async function GET(request: NextRequest) {
  const target = new URL(safeNext(request.cookies.get(AUTH_NEXT_COOKIE)?.value), request.nextUrl.origin);
  const failure = await finishSignIn(request);
  target.searchParams.set("auth", failure ?? "signed-in");
  const response = NextResponse.redirect(target);
  for (const name of [AUTH_NEXT_COOKIE, GOOGLE_STATE_COOKIE, GOOGLE_NONCE_COOKIE]) {
    response.cookies.delete({ name, path: AUTH_COOKIE_PATH });
  }
  return response;
}
