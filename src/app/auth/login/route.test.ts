import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://stub.supabase.co");
vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "stub-key");

// The real client builds the provider URL without touching the network.
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: async () => createClient("https://stub.supabase.co", "stub-key"),
}));

const { GET } = await import("./route");

const respond = (query: string) => GET(new NextRequest(`https://site.test/auth/login${query}`));
const visit = async (query: string) => new URL((await respond(query)).headers.get("location")!);

describe("the sign-in route", () => {
  it.each(["discord", "google"])("sends a visitor to %s and back to this site", async (provider) => {
    const target = await visit(`?provider=${provider}`);
    expect(target.pathname).toBe("/auth/v1/authorize");
    expect(target.searchParams.get("provider")).toBe(provider);
    expect(target.searchParams.get("redirect_to")).toBe("https://site.test/auth/callback");
  });

  it.each(["", "?provider=github", "?provider="])("does not start a sign-in for %j", async (query) => {
    const target = await visit(query);
    expect(target.href).toBe("https://site.test/wardrobe");
  });

  // The allow list matches redirect_to exactly, so the page cannot travel in it.
  it("remembers the page in a cookie and leaves the redirect alone", async () => {
    const response = await respond("?provider=google&next=%2Finspector");
    const target = new URL(response.headers.get("location")!);
    expect(target.searchParams.get("redirect_to")).toBe("https://site.test/auth/callback");
    expect(response.headers.get("set-cookie")).toContain("eclipse-auth-next=%2Finspector");
    expect(response.headers.get("set-cookie")).toMatch(/HttpOnly/i);
  });

  it("will not remember a page off this site", async () => {
    const response = await respond("?provider=google&next=%2F%5Cevil.com");
    expect(response.headers.get("set-cookie")).toContain("eclipse-auth-next=%2Fwardrobe");
  });
});

// With its own Google credentials the site is the one Google redirects to, so the
// consent screen stops naming the Supabase project.
describe("the sign-in route with Google credentials", () => {
  beforeEach(() => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "client-id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "client-secret");
  });
  afterEach(() => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "");
  });

  it("sends a visitor straight to Google and back to this site", async () => {
    const target = await visit("?provider=google");
    expect(target.origin + target.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(target.searchParams.get("client_id")).toBe("client-id");
    expect(target.searchParams.get("redirect_uri")).toBe("https://site.test/auth/callback/google");
    expect(target.searchParams.get("response_type")).toBe("code");
    expect(target.searchParams.get("scope")).toBe("openid email profile");
  });

  it("never puts the secret in the address", async () => {
    expect((await visit("?provider=google")).href).not.toContain("client-secret");
  });

  it("remembers the state, the nonce and the page in private cookies", async () => {
    const response = await respond("?provider=google&next=%2Finspector");
    const target = new URL(response.headers.get("location")!);
    expect(response.cookies.get("eclipse-auth-state")?.value).toBe(target.searchParams.get("state"));
    expect(response.cookies.get("eclipse-auth-next")?.value).toBe("/inspector");
    for (const name of ["eclipse-auth-state", "eclipse-auth-nonce", "eclipse-auth-next"]) {
      expect(response.cookies.get(name)).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/auth" });
    }
  });

  // Supabase hashes the nonce it is handed and compares that with the token's.
  it("gives Google the hash of the nonce it keeps", async () => {
    const response = await respond("?provider=google");
    const nonce = response.cookies.get("eclipse-auth-nonce")!.value;
    const target = new URL(response.headers.get("location")!);
    expect(target.searchParams.get("nonce")).toBe(createHash("sha256").update(nonce).digest("hex"));
  });

  it("starts a new state and nonce every time", async () => {
    const [first, second] = await Promise.all([respond("?provider=google"), respond("?provider=google")]);
    expect(first.cookies.get("eclipse-auth-state")?.value).not.toBe(second.cookies.get("eclipse-auth-state")?.value);
    expect(first.cookies.get("eclipse-auth-nonce")?.value).not.toBe(second.cookies.get("eclipse-auth-nonce")?.value);
  });

  it("leaves Discord with Supabase", async () => {
    const target = await visit("?provider=discord");
    expect(target.pathname).toBe("/auth/v1/authorize");
    expect(target.searchParams.get("provider")).toBe("discord");
  });
});
