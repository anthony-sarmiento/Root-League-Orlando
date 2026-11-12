import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, supabaseKey, supabaseUrl } from "@/lib/supabase/config";

/**
 * Keeps the Supabase session fresh and sends signed-out visitors away from /account, /report and /admin.
 * This is a convenience redirect only — every admin page and action re-checks
 * admin rights itself, and the database enforces them with row-level security.
 */
export async function proxy(request: NextRequest) {
  if (!isSupabaseConfigured) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  if ((pathname.startsWith("/admin") || pathname.startsWith("/account") || pathname.startsWith("/report")) && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if ((pathname === "/login" || pathname === "/signup") && user) {
    return NextResponse.redirect(new URL("/account", request.url));
  }
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/account/:path*", "/report/:path*", "/login", "/signup"],
};
