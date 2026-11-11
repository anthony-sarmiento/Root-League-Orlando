import { describe, expect, it } from "vitest";
import type { FactionId, Game, Placement, Player } from "./league";
import { DEFAULT_SEASONS, featuredSeason, seasonByNumber, seasonForDate, seasonPhase } from "./seasons";
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
  const S = DEFAULT_SEASONS; // S1: Jun 7 - Sep 7, S2: Nov 1 - Dec 20 (2026)

  it("finds the season a date falls in, edges included", () => {
    expect(seasonForDate(S, "2026-06-07")?.number).toBe(1);
    expect(seasonForDate(S, "2026-09-07")?.number).toBe(1);
    expect(seasonForDate(S, "2026-11-01")?.number).toBe(2);
    expect(seasonForDate(S, "2026-12-20")?.number).toBe(2);
  });

  it("returns nothing for dates between seasons", () => {
    expect(seasonForDate(S, "2026-06-06")).toBeUndefined();
    expect(seasonForDate(S, "2026-09-08")).toBeUndefined();
    expect(seasonForDate(S, "2026-12-21")).toBeUndefined();
  });

  it("labels seasons with their real dates", () => {
    expect(S[0].label).toBe("Season 1 · Jun 7 – Sep 7, 2026");
    expect(S[1].label).toBe("Season 2 · Nov 1 – Dec 20, 2026");
  });

  it("reports whether a season is upcoming, live or finished", () => {
    expect(seasonPhase(S[1], "2026-10-31")).toBe("upcoming");
    expect(seasonPhase(S[1], "2026-11-01")).toBe("live");
    expect(seasonPhase(S[1], "2026-12-20")).toBe("live");
    expect(seasonPhase(S[1], "2026-12-21")).toBe("finished");
  });

  it("features the live season, then the next upcoming one, then the latest finished", () => {
    expect(featuredSeason(S, "2026-07-01")?.number).toBe(1);
    expect(featuredSeason(S, "2026-11-11")?.number).toBe(2);
    expect(featuredSeason(S, "2026-10-01")?.number).toBe(2); // between seasons: next up
    expect(featuredSeason(S, "2027-02-01")?.number).toBe(2); // all finished: the latest
    expect(featuredSeason([], "2026-11-11")).toBeUndefined();
  });

  it("only counts games inside the season", () => {
    const games = [
      game("g0", "2026-10-15", ["a", "b", "c", "d"]), // off-season
      game("g1", "2026-09-07", ["a", "b", "c", "d"]),
      game("g2", "2026-11-01", ["a", "b", "c", "d"]),
    ];
    expect(gamesInSeason(games, seasonByNumber(S, 2)!).map((g) => g.id)).toEqual(["g2"]);
    expect(gamesInSeason(games, seasonByNumber(S, 1)!).map((g) => g.id)).toEqual(["g1"]);
  });
});

describe("buildPlayerProfile", () => {
  it("computes totals and a per-season rank", () => {
    const games = [
      game("g1", "2026-08-01", ["a", "b", "c", "d"]),
      game("g2", "2026-11-03", ["a", "b", "c", "d"]),
      game("g3", "2026-11-05", ["b", "c", "a", "d"]),
    ];
    // Season 2: a = 5 + 2 = 7 LP, b = 3 + 5 = 8 LP.
    const profile = buildPlayerProfile(players[0], players, games, DEFAULT_SEASONS);
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
    const profile = buildPlayerProfile(players[0], players, games, DEFAULT_SEASONS);
    expect(profile.bestFaction?.faction).toBe("eyrie");
    expect(profile.bestFaction?.winrate).toBe(1);
  });

  it("falls back to any faction when none has enough games", () => {
    const profile = buildPlayerProfile(players[0], players, [game("g1", "2026-11-01", ["a", "b", "c", "d"])], DEFAULT_SEASONS);
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
