import type { FactionId, Game, Placement } from "./league";

export type ReportStatus = "pending" | "approved" | "rejected";

/** A table a player has reported, waiting for (or past) an organizer's review. */
export interface GameReport {
  id: string;
  reporterPlayerId: string;
  reporterName?: string;
  playedOn: string;
  sessionId?: string;
  round: number;
  results: { playerId: string; faction: FactionId; placement: Placement }[];
  note?: string;
  status: ReportStatus;
  rejectReason?: string;
  createdAt: string;
}

export interface ReportRow {
  id: string;
  reporter_player_id: string;
  played_on: string;
  session_id: string | null;
  round: number;
  results: { player_id: string; faction: FactionId; placement: Placement }[];
  note: string | null;
  status: ReportStatus;
  reject_reason: string | null;
  created_at: string;
  players?: { name: string } | { name: string }[] | null;
}

export const REPORT_COLUMNS =
  "id, reporter_player_id, played_on, session_id, round, results, note, status, reject_reason, created_at, players:reporter_player_id(name)";

export function toReport(row: ReportRow): GameReport {
  const joined = Array.isArray(row.players) ? row.players[0] : row.players;
  return {
    id: row.id,
    reporterPlayerId: row.reporter_player_id,
    reporterName: joined?.name,
    playedOn: row.played_on,
    sessionId: row.session_id ?? undefined,
    round: row.round,
    results: (row.results ?? []).map((r) => ({ playerId: r.player_id, faction: r.faction, placement: r.placement })),
    note: row.note ?? undefined,
    status: row.status,
    rejectReason: row.reject_reason ?? undefined,
    createdAt: row.created_at,
  };
}

/** A report as a Game, so the table form can be pre-filled from it. */
export function reportAsGame(report: GameReport): Game {
  return {
    id: report.id,
    round: report.round,
    playedOn: report.playedOn,
    sessionId: report.sessionId,
    results: report.results,
  };
}

/** True when a logged game already has exactly these players on the same date: probably the same table. */
export function looksLikeDuplicate(report: GameReport, games: Game[]): boolean {
  const key = (ids: string[]) => [...ids].sort().join("|");
  const reported = key(report.results.map((r) => r.playerId));
  return games.some((g) => g.playedOn === report.playedOn && key(g.results.map((r) => r.playerId)) === reported);
}
