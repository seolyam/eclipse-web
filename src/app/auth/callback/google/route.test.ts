import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://stub.supabase.co");
vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "stub-key");
vi.stubEnv("GOOGLE_CLIENT_ID", "client-id");
vi.stubEnv("GOOGLE_CLIENT_SECRET", "client-secret");

const signInWithIdToken = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: async () => ({ auth: { signInWithIdToken } }),
}));

const googleToken = vi.fn();
vi.stubGlobal("fetch", googleToken);

const { GET } = await import("./route");

const STARTED = { "eclipse-auth-state": "the-state", "eclipse-auth-nonce": "the-nonce" };

const visit = (query: string, cookies: Record<string, string> = STARTED) =>
  GET(
    new NextRequest(`https://site.test/auth/callback/google${query}`, {
      headers: {
        cookie: Object.entries(cookies)
          .map(([name, value]) => `${name}=${encodeURIComponent(value)}`)
          .join("; "),
      },
    }),
  );
const landing = (response: Response) => response.headers.get("location");

beforeEach(() => {
  signInWithIdToken.mockReset();
  signInWithIdToken.mockResolvedValue({ error: null });
  googleToken.mockReset();
  googleToken.mockResolvedValue(Response.json({ id_token: "id-token", access_token: "access-token" }));
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("the Google sign-in callback", () => {
  it("swaps the code at Google with this site's own address and secret", async () => {
    await visit("?code=abc&state=the-state");
    const [url, init] = googleToken.mock.calls[0];
    expect(url).toBe("https://oauth2.googleapis.com/token");
    expect(init.method).toBe("POST");
    expect(Object.fromEntries(init.body)).toEqual({
      code: "abc",
      client_id: "client-id",
      client_secret: "client-secret",
      redirect_uri: "https://site.test/auth/callback/google",
      grant_type: "authorization_code",
    });
  });

  // Google's token carries a hash of the access token, which Supabase checks.
  it("signs in with both tokens and the unhashed nonce", async () => {
    await visit("?code=abc&state=the-state");
    expect(signInWithIdToken).toHaveBeenCalledWith({
      provider: "google",
      token: "id-token",
      access_token: "access-token",
      nonce: "the-nonce",
    });
  });

  it("returns a signed-in visitor to the page they left", async () => {
    const response = await visit("?code=abc&state=the-state", { ...STARTED, "eclipse-auth-next": "/inspector" });
    expect(landing(response)).toBe("https://site.test/inspector?auth=signed-in");
  });

  it("stays on this site", async () => {
    const response = await visit("?code=abc&state=the-state", { ...STARTED, "eclipse-auth-next": "/\\evil.com" });
    expect(landing(response)).toBe("https://site.test/wardrobe?auth=signed-in");
  });

  it("clears everything it remembered", async () => {
    const response = await visit("?code=abc&state=the-state", { ...STARTED, "eclipse-auth-next": "/inspector" });
    const cleared = response.headers.getSetCookie().map((cookie) => cookie.split("=")[0]);
    expect(cleared.sort()).toEqual(["eclipse-auth-next", "eclipse-auth-nonce", "eclipse-auth-state"]);
    expect(response.headers.getSetCookie().join()).toMatch(/Path=\/auth/);
  });

  it.each([
    ["a state that does not match", "?code=abc&state=forged", STARTED],
    ["no state", "?code=abc", STARTED],
    ["a browser that never started", "?code=abc&state=the-state", {}],
    ["no nonce", "?code=abc&state=the-state", { "eclipse-auth-state": "the-state" }],
    ["no code", "?state=the-state", STARTED],
  ])("refuses %s without asking Google", async (_, query, cookies) => {
    expect(landing(await visit(query, cookies))).toBe("https://site.test/wardrobe?auth=failed");
    expect(googleToken).not.toHaveBeenCalled();
    expect(signInWithIdToken).not.toHaveBeenCalled();
  });

  it("says so when Google refuses the code", async () => {
    googleToken.mockResolvedValue(Response.json({ error: "invalid_grant" }, { status: 400 }));
    expect(landing(await visit("?code=abc&state=the-state"))).toBe("https://site.test/wardrobe?auth=failed");
    expect(signInWithIdToken).not.toHaveBeenCalled();
  });

  it("says so when Google cannot be reached", async () => {
    googleToken.mockRejectedValue(new TypeError("fetch failed"));
    expect(landing(await visit("?code=abc&state=the-state"))).toBe("https://site.test/wardrobe?auth=failed");
  });

  it("says so when Supabase refuses the token", async () => {
    signInWithIdToken.mockResolvedValue({ error: new Error("bad token") });
    expect(landing(await visit("?code=abc&state=the-state"))).toBe("https://site.test/wardrobe?auth=failed");
  });

  it("tells a change of mind from a failure", async () => {
    const response = await visit("?error=access_denied&state=the-state", { ...STARTED, "eclipse-auth-next": "/inspector" });
    expect(landing(response)).toBe("https://site.test/inspector?auth=cancelled");
    expect(googleToken).not.toHaveBeenCalled();
  });
});
