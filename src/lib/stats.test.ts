import { describe, expect, it } from "vitest";
import type { FactionId, Game, Placement, Player } from "./league";
import { seasonByNumber, seasonForDate } from "./seasons";
import { buildFactionStats, buildLeaderboard, buildPlayerProfile, gamesInSeason } from "./stats";

const players: Player[] = ["a", "b", "c", "d", "e"].map((id) => ({ id, name: id.toUpperCase() }));

const FACTION_ORDER: FactionId[] = ["marquise", "eyrie", "alliance", "vagabond"];

/** Build a game from player ids listed 1st to 4th. */
function game(id: string, playedOn: string, order: string[], factions = FACTION_ORDER): Game {
  return {
    id,
    playedOn,
    results: order.map((playerId, i) => ({
      playerId,
      faction: factions[i],
      placement: (i + 1) as Placement,
    })),
  };
}

describe("buildLeaderboard", () => {
  it("awards 5/3/2/1 LP by finishing place", () => {
    const rows = buildLeaderboard(players, [game("g1", "2026-11-03", ["a", "b", "c", "d"])]);
    expect(rows.map((r) => [r.player.id, r.lp])).toEqual([
      ["a", 5],
      ["b", 3],
      ["c", 2],
      ["d", 1],
    ]);
  });

  it("only lists players who played", () => {
    const rows = buildLeaderboard(players, [game("g1", "2026-11-03", ["a", "b", "c", "d"])]);
    expect(rows.find((r) => r.player.id === "e")).toBeUndefined();
  });

  it("breaks LP ties by wins, then average placement", () => {
    // a: 1st (5) + 4th (1) = 6 LP, 1 win.  b: 2nd (3) + 2nd (3) = 6 LP, 0 wins.
    const games = [
      game("g1", "2026-11-03", ["a", "b", "c", "d"]),
      game("g2", "2026-11-05", ["e", "b", "c", "a"]),
    ];
    const rows = buildLeaderboard(players, games);
    expect(rows[0].player.id).toBe("a");
    expect(rows[1].player.id).toBe("b");
    expect(rows[0].lp).toBe(6);
    expect(rows[1].lp).toBe(6);
  });

  it("gives players who are level on every tiebreaker the same rank", () => {
    // Two games with swapped seats: a/b and c/d mirror each other exactly.
    const games = [
      game("g1", "2026-11-03", ["a", "b", "c", "d"]),
      game("g2", "2026-11-05", ["b", "a", "d", "c"]),
    ];
    const rows = buildLeaderboard(players, games);
    const rankOf = (id: string) => rows.find((r) => r.player.id === id)!.rank;
    expect(rankOf("a")).toBe(1);
    expect(rankOf("b")).toBe(1);
    expect(rankOf("c")).toBe(3);
    expect(rankOf("d")).toBe(3);
  });
});

describe("seasons", () => {
  it("splits calendar months into two-month seasons", () => {
    expect(seasonForDate("2026-10-31").number).toBe(1);
    expect(seasonForDate("2026-11-01").number).toBe(2);
    expect(seasonForDate("2026-12-31").number).toBe(2);
    expect(seasonForDate("2027-01-01").number).toBe(3);
  });

  it("only counts games inside the season", () => {
    const games = [game("g1", "2026-10-31", ["a", "b", "c", "d"]), game("g2", "2026-11-01", ["a", "b", "c", "d"])];
    expect(gamesInSeason(games, seasonByNumber(2)).map((g) => g.id)).toEqual(["g2"]);
  });
});

describe("buildPlayerProfile", () => {
  it("computes totals and a per-season rank", () => {
    const games = [
      game("g1", "2026-10-01", ["a", "b", "c", "d"]),
      game("g2", "2026-11-03", ["a", "b", "c", "d"]),
      game("g3", "2026-11-05", ["b", "c", "a", "d"]),
    ];
    // Season 2: a = 5 + 2 = 7 LP, b = 3 + 5 = 8 LP.
    const profile = buildPlayerProfile(players[0], players, games);
    expect(profile.games).toBe(3);
    expect(profile.wins).toBe(2);
    expect(profile.lp).toBe(12);
    expect(profile.bySeason.map((s) => [s.season.number, s.rank])).toEqual([
      [2, 2],
      [1, 1],
    ]);
  });

  it("picks the best faction among those played enough times", () => {
    const eyrieFirst = ["eyrie", "marquise", "alliance", "vagabond"] as FactionId[];
    const games = [
      game("g1", "2026-11-01", ["a", "b", "c", "d"], eyrieFirst), // a wins as eyrie
      game("g2", "2026-11-02", ["a", "b", "c", "d"], eyrieFirst), // a wins as eyrie
      game("g3", "2026-11-03", ["b", "a", "c", "d"], eyrieFirst), // a 2nd as marquise
      game("g4", "2026-11-04", ["b", "c", "d", "a"]), // a 4th as vagabond
    ];
    const profile = buildPlayerProfile(players[0], players, games);
    expect(profile.bestFaction?.faction).toBe("eyrie");
    expect(profile.bestFaction?.winrate).toBe(1);
  });

  it("falls back to any faction when none has enough games", () => {
    const profile = buildPlayerProfile(players[0], players, [game("g1", "2026-11-01", ["a", "b", "c", "d"])]);
    expect(profile.bestFaction?.faction).toBe("marquise");
  });
});

describe("buildFactionStats", () => {
  it("reports win rate and top player per faction", () => {
    const rows = buildFactionStats(players, [
      game("g1", "2026-11-03", ["a", "b", "c", "d"]),
      game("g2", "2026-11-05", ["a", "b", "c", "d"]),
    ]);
    const marquise = rows.find((r) => r.faction === "marquise")!;
    expect(marquise.games).toBe(2);
    expect(marquise.winrate).toBe(1);
    expect(marquise.topPlayer?.player.id).toBe("a");
  });
});
