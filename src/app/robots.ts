import type { MetadataRoute } from "next";

/** Search engines may read the public pages; the private ones (and the form pages) are off limits. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/account", "/report", "/login", "/signup"] }],
  };
}
