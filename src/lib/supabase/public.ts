import { createClient } from "@supabase/supabase-js";
import { supabaseKey, supabaseUrl } from "./config";

/** Anonymous client for public, read-only league data (row-level security allows reads). */
export function createPublicClient() {
  if (!supabaseUrl || !supabaseKey) throw new Error("Supabase is not configured");
  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
