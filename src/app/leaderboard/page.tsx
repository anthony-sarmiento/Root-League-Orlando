import type { Metadata } from "next";
import { Trophy } from "lucide-react";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { LpScale } from "@/components/LpScale";
import { PageHeader } from "@/components/PageHeader";
import { Podium } from "@/components/Podium";
import { SeasonPicker, parseSeasonParam } from "@/components/SeasonPicker";
import { getLeagueData } from "@/lib/data";
import { featuredSeason, seasonPhase, todayISO } from "@/lib/seasons";
import { buildLeaderboard, gamesInSeason } from "@/lib/stats";

export const metadata: Metadata = { title: "Leaderboard" };
export const dynamic = "force-dynamic";

export default async function LeaderboardPage({ searchParams }: PageProps<"/leaderboard">) {
  const { season: seasonParam } = await searchParams;
  const { players, games, seasons } = await getLeagueData();
  const today = todayISO();
  const featured = featuredSeason(seasons, today);
  const selected = parseSeasonParam(
    seasonParam,
    seasons.map((s) => s.number),
    featured?.number ?? "all",
  );
  const season = seasons.find((s) => s.number === selected);
  const rows = season ? buildLeaderboard(players, gamesInSeason(games, season)) : [];
  const phase = season ? seasonPhase(season, today) : undefined;
  const leader = rows[0];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Leaderboard"
        pattern="marquise"
        description="Every game earns league points. When a season ends, the player with the most LP wins the prize pool."
      >
        <SeasonPicker basePath="/leaderboard" seasons={seasons} selected={selected} />
      </PageHeader>

      {season && phase === "finished" && leader && (
        <p className="card stitched flex items-center justify-center gap-3 p-5 text-center font-display text-xl font-bold">
          <Trophy className="text-honey" size={28} aria-hidden="true" />
          <span>
            {season.label.split(" · ")[0]} champion: <span className="text-acorn-deep">{leader.player.name}</span> with{" "}
            {leader.lp} LP
          </span>
        </p>
      )}

      {season && phase === "upcoming" && (
        <p className="card stitched p-5 text-center font-semibold">
          {season.label.split(" · ")[0]} hasn&apos;t started yet. The standings fill in once games are played.
        </p>
      )}

      {rows.length > 0 && (
        <section className="card p-5 sm:p-7">
          <Podium rows={rows} players={players} />
        </section>
      )}

      <section className="card">
        <LeaderboardTable
          rows={rows}
          players={players}
          emptyMessage={season ? "No games played in this season yet. The woods are quiet…" : "No season has been set up yet."}
        />
      </section>

      <section className="card p-5 sm:p-7">
        <h2 className="text-2xl font-bold">How league points work</h2>
        <div className="mt-4 grid items-end gap-6 md:grid-cols-2">
          <LpScale />
          <p className="max-w-[50ch] text-bark-soft">
            Every game seats four players, and where you finish sets your points. If two players are level on LP, the
            one with more wins ranks higher, then the better average finish.
          </p>
        </div>
      </section>
    </div>
  );
}
