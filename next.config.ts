import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
    ];
  },
};

export default nextConfig;
