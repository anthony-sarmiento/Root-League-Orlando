import {
  FACTIONS,
  MIN_GAMES_FOR_BEST_FACTION,
  lpForPlacement,
  type FactionId,
  type Game,
  type Placement,
  type Player,
} from "./league";
import { isInSeason, seasonForDate, type Season } from "./seasons";

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

function addResult(t: Tally, placement: Placement, tableSize: number) {
  t.games += 1;
  t.wins += placement === 1 ? 1 : 0;
  t.lp += lpForPlacement(placement, tableSize);
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
      addResult(t, r.placement, game.results.length);
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

export function buildPlayerProfile(
  player: Player,
  players: Player[],
  games: Game[],
  seasons: Season[],
): PlayerProfile {
  const byId = new Map(players.map((p) => [p.id, p]));
  const total = emptyTally();
  const factionTallies = new Map<FactionId, Tally>();
  const history: HistoryEntry[] = [];

  const mine = games
    .filter((g) => g.results.some((r) => r.playerId === player.id))
    .sort((a, b) => b.playedOn.localeCompare(a.playedOn) || b.id.localeCompare(a.id));

  for (const game of mine) {
    const result = game.results.find((r) => r.playerId === player.id)!;
    addResult(total, result.placement, game.results.length);
    const ft = factionTallies.get(result.faction) ?? emptyTally();
    addResult(ft, result.placement, game.results.length);
    factionTallies.set(result.faction, ft);

    history.push({
      gameId: game.id,
      playedOn: game.playedOn,
      faction: result.faction,
      placement: result.placement,
      lp: lpForPlacement(result.placement, game.results.length),
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
  const seasonNumbers = [
    ...new Set(
      mine.flatMap((g) => {
        const season = seasonForDate(seasons, g.playedOn);
        return season ? [season.number] : [];
      }),
    ),
  ].sort((a, b) => b - a);
  const bySeason: SeasonRecord[] = seasonNumbers.map((n) => {
    const season = seasons.find((s) => s.number === n)!;
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

// ---- Faction matchups -----------------------------------------------------

/** How one faction has done against another at shared tables: a faction "beats" another by finishing above it. */
export interface Matchup {
  opponent: FactionId;
  /** Tables where both were seated. */
  tables: number;
  wins: number;
  losses: number;
}

/** A matchup needs at least this many shared tables before it can name a rival or a best matchup. */
export const MIN_MATCHUP_TABLES = 2;

/** Every faction's record against every other faction it has shared a table with. */
export function buildMatchupTable(games: Game[]): Map<FactionId, Map<FactionId, Matchup>> {
  const table = new Map<FactionId, Map<FactionId, Matchup>>();
  const cell = (a: FactionId, b: FactionId): Matchup => {
    const row = table.get(a) ?? new Map<FactionId, Matchup>();
    table.set(a, row);
    const m = row.get(b) ?? { opponent: b, tables: 0, wins: 0, losses: 0 };
    row.set(b, m);
    return m;
  };
  for (const game of games) {
    for (const a of game.results) {
      for (const b of game.results) {
        if (a.faction === b.faction) continue;
        const m = cell(a.faction, b.faction);
        m.tables += 1;
        if (a.placement < b.placement) m.wins += 1;
        else if (a.placement > b.placement) m.losses += 1;
      }
    }
  }
  return table;
}

export interface FactionMatchups {
  /** Everyone it has met, most tables first. */
  matchups: Matchup[];
  /** The faction it loses to most often (by share of shared tables), if there is enough to say. */
  rival: Matchup | null;
  /** The faction it beats most often (by share of shared tables), if there is enough to say. */
  best: Matchup | null;
}

const order = new Map(FACTIONS.map((f, i) => [f.id, i]));

export function pickMatchups(row: Map<FactionId, Matchup> | undefined): FactionMatchups {
  const matchups = [...(row?.values() ?? [])].sort(
    (a, b) => b.tables - a.tables || order.get(a.opponent)! - order.get(b.opponent)!,
  );
  // Rates compared as cross-multiplied fractions would be exact; plain division is fine at these sizes.
  const enough = matchups.filter((m) => m.tables >= MIN_MATCHUP_TABLES);
  const top = (key: "wins" | "losses"): Matchup | null => {
    const ranked = enough
      .filter((m) => m[key] > 0)
      .sort((a, b) => b[key] / b.tables - a[key] / a.tables || b.tables - a.tables || order.get(a.opponent)! - order.get(b.opponent)!);
    return ranked[0] ?? null;
  };
  return { matchups, rival: top("losses"), best: top("wins") };
}

// ---- Faction stats --------------------------------------------------------

export interface FactionStatRow {
  faction: FactionId;
  games: number;
  wins: number;
  winrate: number;
  avgPlacement: number;
  topPlayer: { player: Player; wins: number } | null;
  rival: Matchup | null;
  best: Matchup | null;
}

export function buildFactionStats(players: Player[], games: Game[]): FactionStatRow[] {
  const byId = new Map(players.map((p) => [p.id, p]));
  const tallies = new Map<FactionId, Tally>();
  const winsByPlayer = new Map<FactionId, Map<string, number>>();
  const matchupTable = buildMatchupTable(games);

  for (const game of games) {
    for (const r of game.results) {
      const t = tallies.get(r.faction) ?? emptyTally();
      addResult(t, r.placement, game.results.length);
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
      rival: pickMatchups(matchupTable.get(f.id)).rival,
      best: pickMatchups(matchupTable.get(f.id)).best,
    };
  }).sort((a, b) => b.winrate - a.winrate || b.games - a.games);
}

// ---- One faction in depth --------------------------------------------------

export interface FactionPlayerRow {
  player: Player;
  games: number;
  wins: number;
  winrate: number;
  avgPlacement: number;
  /** League points this player has earned playing this faction. */
  lp: number;
}

export interface FactionDetail {
  faction: FactionId;
  games: number;
  wins: number;
  winrate: number;
  avgPlacement: number;
  /** Total league points earned by everyone who played this faction. */
  lp: number;
  /** How often it finished 1st, 2nd, 3rd and 4th. */
  placements: [number, number, number, number];
  /** Everyone who has played it: most games first, then most wins. */
  players: FactionPlayerRow[];
  /** Head-to-head record against every other faction, plus the rival and best matchup. */
  matchups: FactionMatchups;
}

/** How a single faction has done across `games`, and who plays it. */
export function buildFactionDetail(faction: FactionId, players: Player[], games: Game[]): FactionDetail {
  const byId = new Map(players.map((p) => [p.id, p]));
  const total = emptyTally();
  const placements: [number, number, number, number] = [0, 0, 0, 0];
  const perPlayer = new Map<string, Tally>();

  for (const game of games) {
    for (const r of game.results) {
      if (r.faction !== faction) continue;
      addResult(total, r.placement, game.results.length);
      placements[r.placement - 1] += 1;
      const t = perPlayer.get(r.playerId) ?? emptyTally();
      addResult(t, r.placement, game.results.length);
      perPlayer.set(r.playerId, t);
    }
  }

  const rows: FactionPlayerRow[] = [...perPlayer.entries()]
    .flatMap(([id, t]) => {
      const player = byId.get(id);
      return player
        ? [{ player, games: t.games, wins: t.wins, winrate: winrate(t), avgPlacement: avgPlacement(t), lp: t.lp }]
        : [];
    })
    .sort((a, b) => b.games - a.games || b.wins - a.wins || a.player.name.localeCompare(b.player.name));

  return {
    faction,
    games: total.games,
    wins: total.wins,
    winrate: winrate(total),
    avgPlacement: avgPlacement(total),
    lp: total.lp,
    placements,
    players: rows,
    matchups: pickMatchups(buildMatchupTable(games).get(faction)),
  };
}

// ---- League-wide totals ---------------------------------------------------

export function leagueTotals(games: Game[]) {
  const playerIds = new Set<string>();
  for (const g of games) for (const r of g.results) playerIds.add(r.playerId);
  return { games: games.length, players: playerIds.size };
}
