import type { NextConfig } from "next";

// Headers every response carries. (The Content-Security-Policy is built per request in src/proxy.ts, because it
// contains a fresh random nonce.)
const securityHeaders = [
  // Never guess a file's type: a script can't masquerade as an image.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Nobody may put this site in a frame (clickjacking). The CSP's frame-ancestors says the same for modern browsers.
  { key: "X-Frame-Options", value: "DENY" },
  // Other sites only learn which site a visitor came from, never the page or its query.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The site uses none of these browser powers, so turn them off.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), serial=(), interest-cohort=()",
  },
  // Always HTTPS, including subdomains, for two years.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Pages opened from here can't reach back into this window, and vice versa.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

// Pages that show anyone's private details: keep them out of search results and out of shared caches.
const privateHeaders = [
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
  { key: "Cache-Control", value: "private, no-store, max-age=0" },
];

const nextConfig: NextConfig = {
  // Don't advertise the framework in a response header.
  poweredByHeader: false,
  // Artwork is pre-optimized into small WebP files (scripts/build-assets.mjs), so skip the image optimizer.
  images: { unoptimized: true },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      ...["/admin", "/account", "/report", "/login", "/signup"].map((base) => ({
        source: `${base}/:path*`,
        headers: privateHeaders,
      })),
    ];
  },
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
