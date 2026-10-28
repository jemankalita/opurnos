import type { NextConfig } from "next";

// Cache Components is off on purpose: almost every Opurnos page is per-user and
// request-time, so plain dynamic rendering is simpler and has fewer build-time traps.
const nextConfig: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite", "playwright-core", "unpdf"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
