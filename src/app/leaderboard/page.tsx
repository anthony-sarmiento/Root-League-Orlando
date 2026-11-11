import type { Metadata } from "next";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { SeasonPicker, parseSeasonParam } from "@/components/SeasonPicker";
import { getLeagueData } from "@/lib/data";
import { LP_BY_PLACEMENT, PLACEMENTS } from "@/lib/league";
import { ordinal } from "@/lib/format";
import { allSeasonsThrough, currentSeason, seasonByNumber, todayISO } from "@/lib/seasons";
import { buildLeaderboard, gamesInSeason } from "@/lib/stats";

export const metadata: Metadata = { title: "Leaderboard" };
export const dynamic = "force-dynamic";

export default async function LeaderboardPage({ searchParams }: PageProps<"/leaderboard">) {
  const { season: seasonParam } = await searchParams;
  const { players, games } = await getLeagueData();
  const today = todayISO();
  const seasons = allSeasonsThrough(today);
  const current = currentSeason(today);
  const selected = parseSeasonParam(
    seasonParam,
    seasons.map((s) => s.number),
    current.number,
  ) as number;
  const season = seasonByNumber(selected);
  const rows = buildLeaderboard(players, gamesInSeason(games, season));
  const isOver = season.endsOn < today;
  const leader = rows[0];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-4xl font-bold">Leaderboard</h1>
        <p className="mt-1 text-bark-soft">
          Seasons run two months. When one ends, the player with the most LP wins the prize pool.
        </p>
      </header>

      <SeasonPicker basePath="/leaderboard" seasons={seasons} selected={selected} />

      {isOver && leader && (
        <p className="card stitched p-4 text-center font-display text-xl font-bold">
          🏆 {season.label} champion: <span className="text-acorn">{leader.player.name}</span> with {leader.lp} LP
        </p>
      )}

      <section className="card">
        <LeaderboardTable rows={rows} />
      </section>

      <section className="card p-5">
        <h2 className="text-xl font-bold">How LP works</h2>
        <ul className="mt-3 flex flex-wrap gap-3">
          {PLACEMENTS.map((p) => (
            <li key={p} className="rounded-xl bg-parchment px-4 py-2 text-center">
              <span className="block text-sm font-bold text-bark-soft">{ordinal(p)} place</span>
              <span className="font-display text-2xl font-bold text-acorn">{LP_BY_PLACEMENT[p]} LP</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-bark-soft">
          Ties on LP are broken by most wins, then by better average finish.
        </p>
      </section>
    </div>
  );
}
