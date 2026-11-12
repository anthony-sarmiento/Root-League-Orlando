import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { buildCsp } from "@/lib/csp";
import { hardenCookie } from "@/lib/supabase/cookies";
import { isSupabaseConfigured, supabaseKey, supabaseUrl } from "@/lib/supabase/config";

/**
 * Runs before every page:
 *  1. Sets the Content-Security-Policy with a fresh nonce for this request (scripts without it can't run).
 *  2. Keeps the Supabase session fresh and sends signed-out visitors away from /account, /report and /admin.
 *
 * The redirects are a convenience only: every protected page and action re-checks who is asking, and the
 * database enforces the rules with row-level security.
 */
export async function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce, { dev: process.env.NODE_ENV === "development" });

  // The nonce and policy go to Next.js as request headers so it can stamp its own scripts and styles.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  let response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);

  const { pathname } = request.nextUrl;
  const needsSession =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/account") ||
    pathname.startsWith("/report") ||
    pathname === "/login" ||
    pathname === "/signup";
  if (!isSupabaseConfigured || !needsSession) return response;

  const supabase = createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = NextResponse.next({ request: { headers: requestHeaders } });
        response.headers.set("Content-Security-Policy", csp);
        for (const { name, value, options } of toSet) response.cookies.set(name, value, hardenCookie(options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if ((pathname.startsWith("/admin") || pathname.startsWith("/account") || pathname.startsWith("/report")) && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if ((pathname === "/login" || pathname === "/signup") && user) {
    return NextResponse.redirect(new URL("/account", request.url));
  }
  return response;
}

export const config = {
  matcher: [
    {
      // Every page and action, but not static files or prefetches (they need no policy of their own).
      source: "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:webp|png|jpg|jpeg|gif|svg|ico|woff2?|txt|xml)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
