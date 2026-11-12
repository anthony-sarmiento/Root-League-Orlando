import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { hardenCookie } from "./cookies";
import { supabaseKey, supabaseUrl } from "./config";

/** Client tied to the signed-in visitor's session cookies. Use for anything admin. */
export async function createServerSupabase() {
  if (!supabaseUrl || !supabaseKey) throw new Error("Supabase is not configured");
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          for (const { name, value, options } of toSet) cookieStore.set(name, value, hardenCookie(options));
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // The proxy refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}
