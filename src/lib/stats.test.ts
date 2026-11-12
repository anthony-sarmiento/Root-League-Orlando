import { describe, expect, it } from "vitest";
import type { FactionId, Game, Placement, Player } from "./league";
import { DEFAULT_SEASONS, featuredSeason, seasonByNumber, seasonForDate, seasonPhase } from "./seasons";
import { buildFactionDetail, buildFactionStats, buildMatchupTable, pickMatchups, buildLeaderboard, buildPlayerProfile, gamesInSeason } from "./stats";

const players: Player[] = ["a", "b", "c", "d", "e"].map((id) => ({ id, name: id.toUpperCase() }));

const FACTION_ORDER: FactionId[] = ["marquise", "eyrie", "alliance", "vagabond"];

/** Build a game from player ids listed 1st to 4th. */
function game(id: string, playedOn: string, order: string[], factions = FACTION_ORDER): Game {
  return {
    id,
    round: 1,
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

describe("buildFactionDetail", () => {
  const games = [
    game("g1", "2026-11-03", ["a", "b", "c", "d"]), // a marquise 1st, b eyrie 2nd, c alliance 3rd, d vagabond 4th
    game("g2", "2026-11-05", ["b", "a", "d", "c"]), // b marquise 1st, a eyrie 2nd, d alliance 3rd, c vagabond 4th
    game("g3", "2026-11-10", ["a", "c", "b", "d"]), // a marquise 1st again
  ];

  it("totals games, wins, win rate and league points for one faction", () => {
    const d = buildFactionDetail("marquise", players, games);
    expect(d.games).toBe(3);
    expect(d.wins).toBe(3);
    expect(d.winrate).toBe(1);
    expect(d.lp).toBe(15);
    expect(d.placements).toEqual([3, 0, 0, 0]);
  });

  it("lists who plays it, busiest first, with their own record", () => {
    const d = buildFactionDetail("marquise", players, games);
    expect(d.players.map((p) => [p.player.id, p.games, p.wins, p.lp])).toEqual([
      ["a", 2, 2, 10],
      ["b", 1, 1, 5],
    ]);
  });

  it("is empty for a faction nobody has played", () => {
    const d = buildFactionDetail("duchy", players, games);
    expect(d.games).toBe(0);
    expect(d.winrate).toBe(0);
    expect(d.players).toEqual([]);
  });

  it("can be limited to one season's games", () => {
    const d = buildFactionDetail("eyrie", players, games.slice(0, 1));
    expect(d.games).toBe(1);
    expect(d.placements).toEqual([0, 1, 0, 0]);
  });
});

describe("tables of three", () => {
  // Three players: a wins, b second, c third. No fourth place, so the points are 5 / 3 / 2.
  const three: Game = {
    id: "g3",
    round: 2,
    playedOn: "2026-11-03",
    results: [
      { playerId: "a", faction: "marquise", placement: 1 },
      { playerId: "b", faction: "eyrie", placement: 2 },
      { playerId: "c", faction: "alliance", placement: 3 },
    ],
  };

  it("awards 5 / 3 / 2 LP", () => {
    const rows = buildLeaderboard(players, [three]);
    expect(rows.map((r) => [r.player.id, r.lp])).toEqual([
      ["a", 5],
      ["b", 3],
      ["c", 2],
    ]);
  });

  it("mixes with tables of four in one leaderboard", () => {
    const rows = buildLeaderboard(players, [three, game("g4", "2026-11-03", ["c", "a", "b", "d"])]);
    expect(rows.find((r) => r.player.id === "a")?.lp).toBe(5 + 3);
    expect(rows.find((r) => r.player.id === "c")?.lp).toBe(2 + 5);
  });
});

describe("faction matchups", () => {
  // Marquise beats Vagabond every time, beats Eyrie 3 of 4 tables, and loses to Alliance at 2 of 4.
  const games = [
    game("m1", "2026-11-03", ["a", "b", "c", "d"], ["marquise", "eyrie", "alliance", "vagabond"]),
    game("m2", "2026-11-04", ["a", "b", "c", "d"], ["marquise", "eyrie", "alliance", "vagabond"]),
    game("m3", "2026-11-05", ["a", "b", "c", "d"], ["alliance", "eyrie", "marquise", "vagabond"]),
    game("m4", "2026-11-06", ["a", "b", "c", "d"], ["alliance", "marquise", "eyrie", "vagabond"]),
  ];

  it("counts who finished above whom at shared tables", () => {
    const m = buildMatchupTable(games).get("marquise")!.get("eyrie")!;
    expect(m).toEqual({ opponent: "eyrie", tables: 4, wins: 3, losses: 1 });
    expect(buildMatchupTable(games).get("eyrie")!.get("marquise")).toEqual({ opponent: "marquise", tables: 4, wins: 1, losses: 3 });
  });

  it("names the faction it loses to most, and the one it beats most", () => {
    const { rival, best } = pickMatchups(buildMatchupTable(games).get("marquise"));
    expect(rival?.opponent).toBe("alliance"); // lost to Alliance at 2 of 4 tables
    expect(best?.opponent).toBe("vagabond"); // beat Vagabond at 4 of 4 tables
  });

  it("needs enough shared tables and a real win or loss before naming anyone", () => {
    const one = [game("x", "2026-11-03", ["a", "b", "c", "d"])];
    expect(pickMatchups(buildMatchupTable(one).get("marquise"))).toMatchObject({ rival: null, best: null });
    expect(pickMatchups(buildMatchupTable([]).get("marquise"))).toEqual({ matchups: [], rival: null, best: null });
    // Vagabond always finishes last, so it never beats anyone and has no best matchup.
    expect(pickMatchups(buildMatchupTable(games).get("vagabond")).best).toBeNull();
  });

  it("is available on the faction pages' data", () => {
    expect(buildFactionDetail("marquise", players, games).matchups.best?.opponent).toBe("vagabond");
    const row = buildFactionStats(players, games).find((r) => r.faction === "marquise")!;
    expect(row.rival?.opponent).toBe("alliance");
  });
});
