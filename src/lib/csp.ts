/**
 * The Content-Security-Policy for every page. It is built per request, because scripts are allowed by a fresh
 * random nonce: an attacker who manages to inject markup can't run a script, since they can't know the nonce.
 *
 *  - Scripts: only those carrying the nonce (and what those load, via 'strict-dynamic').
 *  - Styles: stylesheets from this site or carrying the nonce; React's inline `style` attributes are allowed
 *    separately, because the layout uses them for colours and sizes (an attribute can't run code).
 *  - Nothing can be framed, no plugins, forms only post back to this site.
 */
export function buildCsp(nonce: string, options: { dev?: boolean; captcha?: boolean } = {}): string {
  const { dev = false, captcha = false } = options;
  // The browser only ever talks to this site: every database call is made by the server, so the database's own
  // address is deliberately not listed here (a script that got in couldn't send data straight to it).
  const connect = ["'self'"];
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
  // The CAPTCHA (Cloudflare Turnstile) draws itself in a frame from Cloudflare. Its script is loaded by our own
  // nonce-carrying script, which 'strict-dynamic' already allows, so only the frame needs naming.
  if (captcha) directives.push("frame-src https://challenges.cloudflare.com");
  if (!dev) directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}
