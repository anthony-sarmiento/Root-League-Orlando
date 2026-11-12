/**
 * The Content-Security-Policy for every page. It is built per request, because scripts are allowed by a fresh
 * random nonce: an attacker who manages to inject markup can't run a script, since they can't know the nonce.
 *
 *  - Scripts: only those carrying the nonce (and what those load, via 'strict-dynamic').
 *  - Styles: stylesheets from this site or carrying the nonce; React's inline `style` attributes are allowed
 *    separately, because the layout uses them for colours and sizes (an attribute can't run code).
 *  - Nothing can be framed, no plugins, forms only post back to this site.
 */
export function buildCsp(nonce: string, options: { dev?: boolean; supabaseUrl?: string } = {}): string {
  const { dev = false, supabaseUrl } = options;
  const connect = ["'self'"];
  if (supabaseUrl) {
    try {
      connect.push(new URL(supabaseUrl).origin);
    } catch {
      // A malformed URL just means no extra origin is allowed.
    }
  }
  // The dev server pushes hot-reload updates over a websocket.
  if (dev) connect.push("ws://localhost:*", "http://localhost:*");

  const directives = [
    "default-src 'self'",
    // React needs eval in development only (to rebuild server error stacks in the browser).
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    // In development the hot-reload runtime injects style tags without a nonce.
    `style-src-elem 'self' ${dev ? "'unsafe-inline'" : `'nonce-${nonce}'`}`,
    "style-src-attr 'unsafe-inline'",
    `style-src 'self' ${dev ? "'unsafe-inline'" : `'nonce-${nonce}'`}`,
    "img-src 'self' blob: data:",
    "font-src 'self'",
    `connect-src ${connect.join(" ")}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "manifest-src 'self'",
  ];
  if (!dev) directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}
