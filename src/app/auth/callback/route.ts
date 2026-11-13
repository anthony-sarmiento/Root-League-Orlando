import { NextResponse, type NextRequest } from "next/server";
import { siteOrigin } from "@/lib/site-url";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * Where Google sends people back to. Supabase hands over a one-time code, which is exchanged for a session
 * (stored in the same hardened cookies as a password sign-in). People always land on /account: the address to go
 * to is never taken from the request, so this can't be used as an open redirect.
 */
export async function GET(request: NextRequest) {
  const origin = siteOrigin(request.headers);
  const code = request.nextUrl.searchParams.get("code");

  if (code && isSupabaseConfigured) {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/account", origin));
    console.error("[oauth-callback] exchange failed:", error.code ?? error.name, error.status);
  }
  return NextResponse.redirect(new URL("/login?error=oauth", origin));
}
