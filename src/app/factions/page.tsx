import type { Metadata } from "next";
import Link from "next/link";
import { FactionBadge } from "@/components/FactionBadge";
import { SeasonPicker, parseSeasonParam } from "@/components/SeasonPicker";
import { getLeagueData } from "@/lib/data";
import { pct } from "@/lib/format";
import { PLAYERS_PER_GAME } from "@/lib/league";
import { allSeasonsThrough, seasonByNumber, todayISO } from "@/lib/seasons";
import { buildFactionStats, gamesInSeason } from "@/lib/stats";

export const metadata: Metadata = { title: "Factions" };
export const dynamic = "force-dynamic";

export default async function FactionsPage({ searchParams }: PageProps<"/factions">) {
  const { season: seasonParam } = await searchParams;
  const { players, games } = await getLeagueData();
  const seasons = allSeasonsThrough(todayISO());
  const selected = parseSeasonParam(seasonParam, seasons.map((s) => s.number), "all", true);
  const scoped = selected === "all" ? games : gamesInSeason(games, seasonByNumber(selected));
  const rows = buildFactionStats(players, scoped);
  const fairShare = 1 / PLAYERS_PER_GAME;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-4xl font-bold">Factions</h1>
        <p className="mt-1 text-bark-soft">
          Which woodland powers are winning? In a {PLAYERS_PER_GAME}-player game an even
          faction wins {pct(fairShare)} of the time.
        </p>
      </header>

      <SeasonPicker basePath="/factions" seasons={seasons} selected={selected} includeAll />

      <section className="card">
        <div className="overflow-x-auto">
          <table className="woods-table">
            <thead>
              <tr>
                <th scope="col">Faction</th>
                <th scope="col" className="num">Games</th>
                <th scope="col" className="num">Wins</th>
                <th scope="col" className="num">Win rate</th>
                <th scope="col" className="num">Avg place</th>
                <th scope="col">Top player</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.faction}>
                  <td><FactionBadge faction={r.faction} size={30} showName /></td>
                  <td className="num">{r.games}</td>
                  <td className="num">{r.wins}</td>
                  <td className="num font-bold">{r.games ? pct(r.winrate) : "–"}</td>
                  <td className="num">{r.games ? r.avgPlacement.toFixed(2) : "–"}</td>
                  <td>
                    {r.topPlayer ? (
                      <Link href={`/players/${r.topPlayer.player.id}`} className="font-semibold hover:text-moss-deep">
                        {r.topPlayer.player.name}{" "}
                        <span className="text-sm text-bark-soft">({r.topPlayer.wins})</span>
                      </Link>
                    ) : (
                      <span className="text-bark-soft">–</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
