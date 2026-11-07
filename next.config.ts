import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // NEXT_DIST_DIR=.next-build pnpm build verifies a build without touching the
  // .next that a running `next dev` is using.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  // The 3D engine and its pack format are workspace packages shipped as TypeScript source.
  transpilePackages: ["@eclipse/engine", "@eclipse/format"],
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
