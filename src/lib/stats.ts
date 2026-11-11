import {
  FACTIONS,
  MIN_GAMES_FOR_BEST_FACTION,
  lpForPlacement,
  type FactionId,
  type Game,
  type Placement,
  type Player,
} from "./league";
import { isInSeason, seasonByNumber, seasonForDate, type Season } from "./seasons";

// ---- Helpers --------------------------------------------------------------

export function gamesInSeason(games: Game[], season: Season): Game[] {
  return games.filter((g) => isInSeason(g.playedOn, season));
}

interface Tally {
  games: number;
  wins: number;
  lp: number;
  placementSum: number;
}

const emptyTally = (): Tally => ({ games: 0, wins: 0, lp: 0, placementSum: 0 });

function addResult(t: Tally, placement: Placement) {
  t.games += 1;
  t.wins += placement === 1 ? 1 : 0;
  t.lp += lpForPlacement(placement);
  t.placementSum += placement;
}

const winrate = (t: Tally) => (t.games ? t.wins / t.games : 0);
const avgPlacement = (t: Tally) => (t.games ? t.placementSum / t.games : 0);

// ---- Leaderboard ----------------------------------------------------------

export interface LeaderboardRow {
  rank: number;
  player: Player;
  games: number;
  wins: number;
  lp: number;
  winrate: number;
  avgPlacement: number;
}

/**
 * Ranks every player who appears in `games`.
 * Order: most LP, then most wins, then better average placement, then name.
 */
export function buildLeaderboard(players: Player[], games: Game[]): LeaderboardRow[] {
  const tallies = new Map<string, Tally>();
  for (const game of games) {
    for (const r of game.results) {
      const t = tallies.get(r.playerId) ?? emptyTally();
      addResult(t, r.placement);
      tallies.set(r.playerId, t);
    }
  }

  const rows = players
    .filter((p) => tallies.has(p.id))
    .map((player) => {
      const t = tallies.get(player.id)!;
      return {
        player,
        games: t.games,
        wins: t.wins,
        lp: t.lp,
        winrate: winrate(t),
        avgPlacement: avgPlacement(t),
      };
    })
    .sort(
      (a, b) =>
        b.lp - a.lp ||
        b.wins - a.wins ||
        a.avgPlacement - b.avgPlacement ||
        a.player.name.localeCompare(b.player.name),
    );

  // Players level on LP *and* every tiebreaker share a rank.
  const ranked: LeaderboardRow[] = [];
  rows.forEach((row, i) => {
    const prev = ranked[i - 1];
    const tied =
      prev !== undefined &&
      prev.lp === row.lp &&
      prev.wins === row.wins &&
      prev.avgPlacement === row.avgPlacement;
    ranked.push({ ...row, rank: tied ? prev.rank : i + 1 });
  });
  return ranked;
}

// ---- Player profile -------------------------------------------------------

export interface FactionRecord {
  faction: FactionId;
  games: number;
  wins: number;
  winrate: number;
  avgPlacement: number;
  lp: number;
}

export interface HistoryEntry {
  gameId: string;
  playedOn: string;
  faction: FactionId;
  placement: Placement;
  lp: number;
  opponents: { player: Player; faction: FactionId; placement: Placement }[];
}

export interface SeasonRecord {
  season: Season;
  rank: number;
  games: number;
  wins: number;
  lp: number;
}

export interface PlayerProfile {
  player: Player;
  games: number;
  wins: number;
  lp: number;
  winrate: number;
  avgPlacement: number;
  byFaction: FactionRecord[];
  bestFaction: FactionRecord | null;
  history: HistoryEntry[]; // newest first
  bySeason: SeasonRecord[]; // newest first
}

export function buildPlayerProfile(player: Player, players: Player[], games: Game[]): PlayerProfile {
  const byId = new Map(players.map((p) => [p.id, p]));
  const total = emptyTally();
  const factionTallies = new Map<FactionId, Tally>();
  const history: HistoryEntry[] = [];

  const mine = games
    .filter((g) => g.results.some((r) => r.playerId === player.id))
    .sort((a, b) => b.playedOn.localeCompare(a.playedOn) || b.id.localeCompare(a.id));

  for (const game of mine) {
    const result = game.results.find((r) => r.playerId === player.id)!;
    addResult(total, result.placement);
    const ft = factionTallies.get(result.faction) ?? emptyTally();
    addResult(ft, result.placement);
    factionTallies.set(result.faction, ft);

    history.push({
      gameId: game.id,
      playedOn: game.playedOn,
      faction: result.faction,
      placement: result.placement,
      lp: lpForPlacement(result.placement),
      opponents: game.results
        .filter((r) => r.playerId !== player.id)
        .sort((a, b) => a.placement - b.placement)
        .flatMap((r) => {
          const p = byId.get(r.playerId);
          return p ? [{ player: p, faction: r.faction, placement: r.placement }] : [];
        }),
    });
  }

  const byFaction: FactionRecord[] = [...factionTallies.entries()]
    .map(([faction, t]) => ({
      faction,
      games: t.games,
      wins: t.wins,
      winrate: winrate(t),
      avgPlacement: avgPlacement(t),
      lp: t.lp,
    }))
    .sort((a, b) => b.games - a.games || b.winrate - a.winrate);

  // Best faction: highest winrate (then avg placement) among factions with enough games,
  // falling back to everything played if no faction has reached the minimum yet.
  const eligible = byFaction.filter((f) => f.games >= MIN_GAMES_FOR_BEST_FACTION);
  const pool = eligible.length ? eligible : byFaction;
  const bestFaction =
    [...pool].sort(
      (a, b) => b.winrate - a.winrate || a.avgPlacement - b.avgPlacement || b.games - a.games,
    )[0] ?? null;

  // Season-by-season record, with the player's rank in each season.
  const seasonNumbers = [...new Set(mine.map((g) => seasonForDate(g.playedOn).number))].sort(
    (a, b) => b - a,
  );
  const bySeason: SeasonRecord[] = seasonNumbers.map((n) => {
    const season = seasonByNumber(n);
    const row = buildLeaderboard(players, gamesInSeason(games, season)).find(
      (r) => r.player.id === player.id,
    )!;
    return { season, rank: row.rank, games: row.games, wins: row.wins, lp: row.lp };
  });

  return {
    player,
    games: total.games,
    wins: total.wins,
    lp: total.lp,
    winrate: winrate(total),
    avgPlacement: avgPlacement(total),
    byFaction,
    bestFaction,
    history,
    bySeason,
  };
}

// ---- Faction stats --------------------------------------------------------

export interface FactionStatRow {
  faction: FactionId;
  games: number;
  wins: number;
  winrate: number;
  avgPlacement: number;
  topPlayer: { player: Player; wins: number } | null;
}

export function buildFactionStats(players: Player[], games: Game[]): FactionStatRow[] {
  const byId = new Map(players.map((p) => [p.id, p]));
  const tallies = new Map<FactionId, Tally>();
  const winsByPlayer = new Map<FactionId, Map<string, number>>();

  for (const game of games) {
    for (const r of game.results) {
      const t = tallies.get(r.faction) ?? emptyTally();
      addResult(t, r.placement);
      tallies.set(r.faction, t);
      if (r.placement === 1) {
        const m = winsByPlayer.get(r.faction) ?? new Map<string, number>();
        m.set(r.playerId, (m.get(r.playerId) ?? 0) + 1);
        winsByPlayer.set(r.faction, m);
      }
    }
  }

  return FACTIONS.map((f) => {
    const t = tallies.get(f.id) ?? emptyTally();
    const top = [...(winsByPlayer.get(f.id)?.entries() ?? [])].sort((a, b) => b[1] - a[1])[0];
    const topPlayer = top && byId.get(top[0]) ? { player: byId.get(top[0])!, wins: top[1] } : null;
    return {
      faction: f.id,
      games: t.games,
      wins: t.wins,
      winrate: winrate(t),
      avgPlacement: avgPlacement(t),
      topPlayer,
    };
  }).sort((a, b) => b.winrate - a.winrate || b.games - a.games);
}

// ---- League-wide totals ---------------------------------------------------

export function leagueTotals(games: Game[]) {
  const playerIds = new Set<string>();
  for (const g of games) for (const r of g.results) playerIds.add(r.playerId);
  return { games: games.length, players: playerIds.size };
}
