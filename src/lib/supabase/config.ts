/**
 * Supabase connection settings. When these env vars are missing the site runs on
 * sample data and the admin area shows setup instructions instead.
 */
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

// Supabase calls this the "publishable" key (older projects: "anon" key). Either works.
export const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);
