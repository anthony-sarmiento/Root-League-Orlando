import { REPORT_COLUMNS, toReport, type GameReport, type ReportRow } from "./game-report";
import { createServerSupabase } from "./supabase/server";

type Supabase = Awaited<ReturnType<typeof createServerSupabase>>;

/** Postgres/PostgREST codes for "that table doesn't exist (yet)": the reports migration hasn't been run. */
const MISSING = new Set(["PGRST205", "42P01"]);

export interface ReportList {
  reports: GameReport[];
  /** False when the database doesn't have reporting yet. */
  available: boolean;
}

/** The signed-in player's own reports, newest first. */
export async function fetchMyReports(supabase: Supabase, userId: string): Promise<ReportList> {
  const { data, error } = await supabase
    .from("game_reports")
    .select(REPORT_COLUMNS)
    .eq("submitted_by", userId)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) return { reports: [], available: !MISSING.has(error.code ?? "") };
  return { reports: ((data ?? []) as unknown as ReportRow[]).map(toReport), available: true };
}

/** Reports waiting for an organizer, oldest first. Only an organizer's session can see everyone's. */
export async function fetchPendingReports(supabase: Supabase): Promise<ReportList> {
  const { data, error } = await supabase
    .from("game_reports")
    .select(REPORT_COLUMNS)
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (error) return { reports: [], available: !MISSING.has(error.code ?? "") };
  return { reports: ((data ?? []) as unknown as ReportRow[]).map(toReport), available: true };
}

/** How many reports are waiting, for the badge in the organizer's navigation. Zero if reporting isn't set up. */
export async function countPendingReports(): Promise<number> {
  const supabase = await createServerSupabase();
  const { count, error } = await supabase
    .from("game_reports")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  return error ? 0 : (count ?? 0);
}
