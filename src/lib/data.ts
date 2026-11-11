import type { FactionId, Game, Placement, Player, Session } from "./league";
import { sampleData } from "./sample-data";
import { isSupabaseConfigured } from "./supabase/config";
import { createPublicClient } from "./supabase/public";

export interface LeagueData {
  players: Player[];
  sessions: Session[];
  games: Game[];
  /** True while the site is showing made-up demo data instead of the real league. */
  isSample: boolean;
}

/**
 * Single entry point for league data. Pages never talk to the database directly.
 * Uses Supabase when its env vars are set, otherwise the built-in sample league.
 */
export async function getLeagueData(): Promise<LeagueData> {
  if (!isSupabaseConfigured) return { ...sampleData, isSample: true };
  return { ...(await fetchFromSupabase()), isSample: false };
}

// Supabase caps a single response (1000 rows by default), so read in pages.
const PAGE_SIZE = 1000;

async function fetchAll<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  label: string,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`Could not load ${label}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

interface GameRow {
  id: string;
  played_on: string;
  session_id: string | null;
  game_results: { player_id: string; faction: FactionId; placement: Placement }[];
}

async function fetchFromSupabase(): Promise<Omit<LeagueData, "isSample">> {
  const db = createPublicClient();

  const [players, sessions, games] = await Promise.all([
    fetchAll<{ id: string; name: string }>(
      (from, to) => db.from("players").select("id, name").order("name").range(from, to),
      "players",
    ),
    fetchAll<{ id: string; date: string; title: string; location: string }>(
      (from, to) => db.from("sessions").select("id, date, title, location").order("date").range(from, to),
      "sessions",
    ),
    fetchAll<GameRow>(
      (from, to) =>
        db
          .from("games")
          .select("id, played_on, session_id, game_results(player_id, faction, placement)")
          .order("played_on")
          .order("id")
          .range(from, to),
      "games",
    ),
  ]);

  return {
    players,
    sessions,
    games: games.map((g) => ({
      id: g.id,
      playedOn: g.played_on,
      sessionId: g.session_id ?? undefined,
      results: g.game_results.map((r) => ({
        playerId: r.player_id,
        faction: r.faction,
        placement: r.placement,
      })),
    })),
  };
}
