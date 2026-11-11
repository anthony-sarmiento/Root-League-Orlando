import type { Game, Player, Session } from "./league";
import { sampleData } from "./sample-data";

export interface LeagueData {
  players: Player[];
  sessions: Session[];
  games: Game[];
  /** True while the site is showing made-up demo data instead of the real league. */
  isSample: boolean;
}

/**
 * Single entry point for league data. Pages never talk to the database directly,
 * so when Supabase is wired up only this function changes.
 */
export async function getLeagueData(): Promise<LeagueData> {
  return { ...sampleData, isSample: true };
}
