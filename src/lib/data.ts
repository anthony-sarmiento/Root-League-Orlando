import { cache } from "react";
import type { FactionId, Game, Placement, Player, Session, Signup } from "./league";
import { asFactionId } from "./profile";
import { sampleData } from "./sample-data";
import { DEFAULT_SEASONS, makeSeason, sortSeasons, type Season } from "./seasons";
import { isSupabaseConfigured } from "./supabase/config";
import { createPublicClient } from "./supabase/public";

export interface LeagueData {
  players: Player[];
  sessions: Session[];
  games: Game[];
  /** Newest first. */
  seasons: Season[];
  /** Who has RSVPed to which game night. */
  signups: Signup[];
  /** True while the site is showing made-up demo data instead of the real league. */
  isSample: boolean;
}

/**
 * Single entry point for league data. Pages never talk to the database directly.
 * Uses Supabase when its env vars are set, otherwise the built-in sample league.
 */
// `cache` shares one fetch between the layout and the page within a single request.
export const getLeagueData = cache(async (): Promise<LeagueData> => {
  if (!isSupabaseConfigured) {
    return { ...sampleData, seasons: sortSeasons(sampleData.seasons), signups: [], isSample: true };
  }
  return { ...(await fetchFromSupabase()), isSample: false };
});

// Supabase caps a single response (1000 rows by default), so read in pages.
const PAGE_SIZE = 1000;

type PageResult<T> = PromiseLike<{ data: T[] | null; error: { message: string; code?: string } | null }>;

async function fetchAll<T>(fetchPage: (from: number, to: number) => PageResult<T>, label: string): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1);
    if (error) throw Object.assign(new Error(`Could not load ${label}: ${error.message}`), { code: error.code });
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

/** Postgres/PostgREST codes for "that table or column doesn't exist (yet)". */
const MISSING = new Set(["PGRST205", "42P01", "42703", "PGRST204"]);

/** For pieces added by a later migration: if the database hasn't been migrated yet, use a fallback. */
async function orFallback<T>(load: () => Promise<T>, fallback: () => T | Promise<T>): Promise<T> {
  try {
    return await load();
  } catch (error) {
    if (MISSING.has((error as { code?: string }).code ?? "")) return fallback();
    throw error;
  }
}

interface PlayerRow {
  id: string;
  name: string;
  bio?: string | null;
  favorite_faction?: string | null;
  avatar?: string | null;
}

interface GameRow {
  id: string;
  played_on: string;
  session_id: string | null;
  game_results: { player_id: string; faction: FactionId; placement: Placement }[];
}

async function fetchFromSupabase(): Promise<Omit<LeagueData, "isSample">> {
  const db = createPublicClient();

  const [players, sessions, games, seasons, signups] = await Promise.all([
    orFallback(
      () =>
        fetchAll<PlayerRow>(
          (from, to) =>
            db.from("players").select("id, name, bio, favorite_faction, avatar").order("name").range(from, to),
          "players",
        ),
      // Database not migrated to profiles yet: plain names only.
      () => fetchAll<PlayerRow>((from, to) => db.from("players").select("id, name").order("name").range(from, to), "players"),
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
    orFallback(
      async () =>
        (
          await fetchAll<{ number: number; starts_on: string; ends_on: string }>(
            (from, to) => db.from("seasons").select("number, starts_on, ends_on").order("number").range(from, to),
            "seasons",
          )
        ).map((s) => makeSeason({ number: s.number, startsOn: s.starts_on, endsOn: s.ends_on })),
      () => DEFAULT_SEASONS,
    ),
    orFallback(
      async () =>
        (
          await fetchAll<{ session_id: string; player_id: string }>(
            (from, to) =>
              db.from("session_signups").select("session_id, player_id").order("created_at").range(from, to),
            "signups",
          )
        ).map((s) => ({ sessionId: s.session_id, playerId: s.player_id })),
      () => [] as Signup[],
    ),
  ]);

  return {
    players: players.map((p) => ({
      id: p.id,
      name: p.name,
      bio: p.bio ?? undefined,
      favoriteFaction: asFactionId(p.favorite_faction),
      avatar: p.avatar ?? undefined,
    })),
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
    seasons: sortSeasons(seasons),
    signups,
  };
}
