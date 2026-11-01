import "server-only";

const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

export const GOOGLE_STATE_COOKIE = "eclipse-auth-state";
export const GOOGLE_NONCE_COOKIE = "eclipse-auth-nonce";

const clientId = () => process.env.GOOGLE_CLIENT_ID ?? "";
const clientSecret = () => process.env.GOOGLE_CLIENT_SECRET ?? "";
const redirectUri = (origin: string) => `${origin}/auth/callback/google`;

/** Unset, as on previews and in local dev, Google sign-in goes through Supabase instead. */
export const googleSignInConfigured = () => Boolean(clientId() && clientSecret());

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// Google's consent screen names the host it redirects to, so this site's own callback
// keeps the Supabase project off it. Supabase hashes the nonce it is handed before
// comparing it with the token's, so Google gets the hash and the cookie keeps the original.
export async function googleAuthorizeUrl(origin: string, state: string, nonce: string) {
  const url = new URL(AUTHORIZE_URL);
  url.search = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: redirectUri(origin),
    response_type: "code",
    scope: "openid email profile",
    state,
    nonce: await sha256Hex(nonce),
  }).toString();
  return url;
}

/** The tokens for a code Google sent back, or null if it would not give them. */
export async function exchangeGoogleCode(code: string, origin: string) {
  try {
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      body: new URLSearchParams({
        code,
        client_id: clientId(),
        client_secret: clientSecret(),
        redirect_uri: redirectUri(origin),
        grant_type: "authorization_code",
      }),
    });
    if (response.ok) return (await response.json()) as { id_token: string; access_token: string };
    console.error("Google refused the sign-in code:", response.status, await response.text());
  } catch (error) {
    console.error("Google could not be reached:", error);
  }
  return null;
}
