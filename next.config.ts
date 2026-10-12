import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // The Postgres driver is loaded by Node directly rather than bundled.
  serverExternalPackages: ["pg"],
  partialPrefetching: true,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.dog.ceo" }],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
