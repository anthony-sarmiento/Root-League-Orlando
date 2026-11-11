import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // League data changes whenever a result is logged, so pages render per request
  // (see `dynamic = "force-dynamic"` on each page) rather than using Cache Components.
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
