import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Native / heavy server-only packages used by the chatbot are loaded by Node directly, not bundled.
  serverExternalPackages: ["@huggingface/transformers", "onnxruntime-node", "sharp", "pg"],
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
