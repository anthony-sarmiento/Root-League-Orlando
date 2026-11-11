import { redirect } from "next/navigation";
import { createServerSupabase } from "./supabase/server";

/**
 * The signed-in visitor plus whether they're a league organizer.
 * Redirects to /login when nobody is signed in.
 */
export async function getAdminContext() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase.rpc("is_admin");
  return { supabase, user, isAdmin: data === true };
}

/** For server actions: the context if the caller is an organizer, otherwise null. */
export async function requireAdminForAction() {
  const ctx = await getAdminContext();
  return ctx.isAdmin ? ctx : null;
}
