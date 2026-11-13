/**
 * The site's own address (no trailing slash), used to tell Google where to send people back to.
 * `NEXT_PUBLIC_SITE_URL` wins when it is set; otherwise it is worked out from the request. Either way Supabase only
 * honours addresses on its own redirect allow-list, so a forged Host header can't send anyone anywhere else.
 */
export function siteOrigin(headers: Headers, configured: string | undefined = process.env.NEXT_PUBLIC_SITE_URL): string {
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      // Fall through to the request's own address.
    }
  }
  const host = (headers.get("x-forwarded-host") ?? headers.get("host") ?? "localhost:3000").split(",")[0].trim();
  const local = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host);
  const proto = local ? "http" : (headers.get("x-forwarded-proto")?.split(",")[0].trim() ?? "https");
  return `${proto === "http" ? "http" : "https"}://${host}`;
}
