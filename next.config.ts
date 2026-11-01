import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // NEXT_DIST_DIR=.next-build pnpm build verifies a build without touching the
  // .next that a running `next dev` is using.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  // Keeps the title and description in <head> for everyone. Otherwise a page with a
  // Suspense boundary flushes first and sends them in the body, Googlebot included.
  htmlLimitedBots: /.*/,
  experimental: {
    // Room for one screenshot (MAX_SCREENSHOT_BYTES) and the form around it.
    serverActions: { bodySizeLimit: "4.5mb" },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      // The game's CDN sends no CORS headers, so a browser can only read it from this
      // address. Only content-addressed data files match: this is no general proxy.
      {
        source: "/game-cdn/data/:a([0-9a-f]{2})/:b([0-9a-f]{2})/:file([0-9a-f]{32})",
        destination: "https://level3.ssl.blizzard.com/tpr/wow/data/:a/:b/:file",
      },
    ];
  },
  async redirects() {
    return [
      { source: "/armory", destination: "/wardrobe", permanent: true },
      { source: "/armory/:id", destination: "/wardrobe/:id", permanent: true },
      { source: "/decode", destination: "/inspector", permanent: true },
      { source: "/world", destination: "/wardrobe", permanent: true },
    ];
  },
};

export default nextConfig;
